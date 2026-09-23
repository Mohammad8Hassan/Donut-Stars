# Donut Stars — Interview Prep Guide

Personal study doc for talking through this project in an interview. Each section has two parts: **"say this out loud"** — a plain-English script you could actually speak — and **likely questions** an interviewer follows up with, answered using real specifics from the codebase (file names, function names, actual trade-offs made), not generic textbook answers.

Read it once end to end, then use the [rapid-fire cheat sheet](#11-rapid-fire-cheat-sheet) the night before / morning of.

## Contents

1. [Elevator pitches](#1-elevator-pitches)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Next.js & the App Router](#3-nextjs--the-app-router)
4. [Auth: JWT, cookies, and the refresh dance](#4-auth-jwt-cookies-and-the-refresh-dance)
5. [State management: Redux cart + RTK Query](#5-state-management-redux-cart--rtk-query)
6. [Database design](#6-database-design)
7. [Order lifecycle, cron, and "live" tracking](#7-order-lifecycle-cron-and-live-tracking)
8. [Security & the server-side trust boundary](#8-security--the-server-side-trust-boundary)
9. [UI system](#9-ui-system)
10. [Honest answers: "what would you improve?"](#10-honest-answers-what-would-you-improve)
11. [System design / whiteboard extensions](#11-system-design--whiteboard-extensions)
12. [Rapid-fire cheat sheet](#12-rapid-fire-cheat-sheet)

---

## 1. Elevator pitches

**30 seconds:**
> "It's a full-stack e-commerce site for a donut shop — browse a menu, build your own box of donuts, check out as a guest or a logged-in customer, and track your order live as it moves from preparing to out-for-delivery to completed. I built the whole thing: Next.js App Router frontend and API routes, a hand-written MySQL schema, JWT auth with refresh tokens, Redux for cart state, and a small cron worker that advances order status over time so the tracking page has something real to poll."

**2 minutes** (add this if they want more): 
> "The interesting design problems were less about CRUD and more about state that changes shape depending on context. A 'box' product doesn't have fixed contents — the customer fills it with donuts at checkout, so I had to model that per-order instead of per-product. The cart has to let someone add three different 6-donut boxes with three different fillings and edit each independently, which meant giving box instances their own identity separate from the product id. And I didn't want to trust anything the client sends at checkout — price, product identity, box contents — so the order API re-resolves and re-prices everything server-side from the cart payload. I also added JWT access/refresh tokens with server-side revocation, so logging out or changing your password actually invalidates the session instead of just deleting a cookie."

**Q: Why a donut shop, of all things?**
- A: Honestly, it's a portfolio project — I picked a domain (food ordering) that's simple to explain to anyone but still has real complexity once you get into it: variable-composition products (boxes), guest vs. account checkout, order status over time, and role-based admin access. It's small enough to finish, but not so small that it's just a to-do list.

---

## 2. Architecture at a glance

| Layer | Tech | Where |
|---|---|---|
| Framework | Next.js 13.5 (App Router), React 18, TypeScript | `app/` |
| Styling / UI kit | Tailwind CSS + shadcn/ui (style "new-york") | `components/ui/*` (primitives), `app/components/*` (app-specific) |
| Client state | Redux Toolkit — plain slice for cart, RTK Query for order data | `app/store/cartSlice.ts`, `app/store/orderApi.ts` |
| Auth state | React Context (deliberately **not** Redux) | `app/context/AuthContext.tsx` |
| Database | MySQL via `mysql2/promise`, hand-written SQL, no ORM | `lib/db.ts`, `db/schema.sql` |
| Auth tokens | JWT access (15m) + refresh (7d), both httpOnly cookies | `lib/auth.ts`, `lib/session.ts`, `app/api/login`, `app/api/refresh` |
| Edge auth gate | `jose` (edge-compatible) in Next middleware | `middleware.ts` |
| Background job | `cron` npm package polling an authenticated API route every 30s | `scripts/cron-worker.mjs` → `GET /api/cron/update-orders` → `lib/advanceOrders.ts` |
| Deploy target | Railway (single instance) | inferred from `lib/rateLimit.ts` comments re: `x-forwarded-for` |

**Say this out loud:**
> "There's no separate backend service — Next.js API routes under `app/api/*` are the backend, talking straight to a MySQL pool. The only other moving part is a tiny standalone Node script that runs `node-cron`-style on a timer and calls one authenticated API route to advance order statuses. Everything else — auth, cart, checkout, tracking — is request/response or client-side polling, no websockets."

**Q: Why Next.js instead of a separate frontend + backend (e.g. React + Express)?**
- A: For a project this size, colocating API routes with the frontend removed a whole layer of deployment/CORS complexity, and the App Router's server components meant I could fetch data server-side without hand-rolling a REST client for every page. The trade-off is that everything ships as one deployable — fine here, but it's the first thing I'd reconsider if this needed independent scaling of frontend vs. API.

**Q: Why MySQL and raw SQL instead of an ORM like Prisma?**
- A: I wanted to actually think in relational terms — foreign keys, joins, transactions — rather than have an ORM's query builder abstract that away, since a big part of the interesting design work here (one `products` table serving three product types, snapshotting shipping addresses onto orders) is fundamentally a schema design problem. The cost is more boilerplate per query and no compile-time query checking; I mitigate the second one with hand-written TypeScript row types next to each query (see `lib/orders.ts`).

---

## 3. Next.js & the App Router

**Say this out loud:**
> "It's the App Router, not Pages — so `app/` folders define routes, `page.tsx` is the route's content, and anything not marked `'use client'` is a React Server Component by default. I use client components where I need interactivity or hooks — cart UI, forms, anything reading Redux or Context — and let pages that just display server-fetched data stay server components. API routes live under `app/api/*/route.ts` and export `GET`/`POST`/etc. handlers directly."

**Q: What's the actual difference between a server and client component here, and how did you decide which is which?**
- A: Server components render on the server and ship zero JS for their own logic to the browser — good for pages that just read data and display it. Client components (`'use client'` at the top of the file) are needed anywhere I use `useState`/`useEffect`/Redux hooks/Context, or need browser-only APIs. Practically: layout/page shells and static content skew server; anything touching the cart, auth context, or RTK Query hooks is a client component, because those all depend on browser state (cookies via `fetch`, `localStorage`, Redux store).

**Q: Where does `middleware.ts` fit in, and why not just check auth inside each page/route?**
- A: Middleware runs on Next's **edge runtime**, before the request even reaches a page or API route, and its `matcher` is scoped to `/admin/:path*` and `/api/admin/:path*` — so it's specifically the admin gate, not a general auth check. It reads the `accessToken` cookie, verifies it, and for admin paths checks `roleName === "admin"` from the JWT payload, returning a redirect (page) or 401/403 JSON (API) before any admin code runs. Ordinary authenticated (non-admin) routes instead check the session inside the route/page itself via `getSession()` (`lib/session.ts`), since middleware's edge runtime can't use `jsonwebtoken` or touch the MySQL pool.

**Q: Why does the app use both `jsonwebtoken` and `jose` for the "same" JWTs?**
- A: `jsonwebtoken` is Node-only — it won't run on Vercel's/Next's edge runtime, which `middleware.ts` is forced to use. `jose` is a JWT library built to work in edge/Web Crypto environments. So the actual API routes (`lib/session.ts`, `lib/auth.ts`) sign and verify with `jsonwebtoken`, while `middleware.ts` verifies the same token with `jose` against the same secret (`JWT_ACCESS_SECRET`) — two libraries, one secret, because they have to run in two different JS runtimes.

**Q: Any App Router gotchas you hit?**
- A: Route Handlers don't get a raw socket, so there's no direct client-IP access for rate limiting — I read `x-forwarded-for` instead (`lib/rateLimit.ts`), which only works correctly once there's a real reverse proxy in front of it (Railway, in this case); locally it just falls back to a constant key. That's a good example of "works today, would need re-checking at a different hosting layer."

---

## 4. Auth: JWT, cookies, and the refresh dance

**Say this out loud:**
> "Login issues two JWTs as httpOnly cookies: a 15-minute access token and a 7-day refresh token. The access token carries `userId`, `roleId`, `roleName` and is what every authenticated route checks. Because 15 minutes is short, the client has a standard 'try, get 401, refresh, retry once' pattern implemented in three different places that all do the same thing: `AuthContext`'s `revalidate()`, `app/api/authFetch.ts` for one-off `fetch` calls, and `orderApi.ts`'s `baseQueryWithReauth` for RTK Query. On refresh, the server checks the refresh token's signature *and* bcrypt-compares it against a hash stored in the `users.refresh_token_hash` column — so a refresh token isn't purely stateless, it's also revocable."

**Q: Why store a hash of the refresh token in the DB at all — doesn't that defeat the point of JWTs being stateless?**
- A: Pure stateless JWTs can't be revoked before they expire — if one leaks, it's valid until it naturally expires. Storing a bcrypt hash of the *current* refresh token per user means logout, or a password change (`app/api/account/password/route.ts`), can just null out `refresh_token_hash`, and the very next refresh attempt with the old token fails `bcrypt.compare()` even though the JWT signature itself still verifies. It's a deliberate trade of "fully stateless" for "revocable," which I think is the right call for anything with a logout button.

**Q: Walk me through what happens when an access token expires while someone is using the app.**
- A: The next request that needs auth gets a 401. Depending on where that happened: (1) a normal page fetch — `authFetch()` catches the 401, calls `POST /api/refresh`, and retries the original request once; (2) the initial page-load check — `AuthContext.revalidate()` does the same `/api/me` → 401 → `/api/refresh` → retry `/api/me` sequence and only clears the user on an explicit 401/403, treating network errors or 5xxs as "inconclusive" so a flaky request doesn't look like a logout; (3) a polling RTK Query hook (e.g. `useGetActiveOrdersQuery`, which can poll in the background for way longer than 15 minutes) — `baseQueryWithReauth` in `orderApi.ts` wraps `fetchBaseQuery` with the identical retry-once logic. All three independently converge on the same pattern because they're solving the same problem in three different calling contexts.

**Q: That's the same logic written three times — why not share it?**
- A: Fair criticism, and it's on my "would refactor" list — see [section 10](#10-honest-answers-what-would-you-improve). In practice they don't share a common HTTP client: one is a raw `fetch` used inside a Context effect, one is a small standalone helper wrapping `fetch`, and one has to conform to RTK Query's `BaseQueryFn` shape. A shared low-level "try, 401, refresh, retry" utility that all three call into would remove the duplication without fighting any of their different call shapes.

**Q: How is the admin role enforced, end to end?**
- A: The JWT payload carries `roleName` at sign time (`signAccessToken` in `lib/auth.ts`), so it doesn't need a DB round-trip to check on every request. `middleware.ts` checks it at the edge for `/admin/*` pages and `/api/admin/*` routes before anything else runs (redirect or 403). Server-side helpers double this: `lib/session.ts` exports `requireAdmin()`, which route handlers can call directly for defense in depth even if middleware's matcher somehow missed a path.

**Q: What stops someone from brute-forcing a login or a password change?**
- A: `lib/rateLimit.ts` — an in-memory, fixed-window limiter keyed by `login:<ip>:<email>` for login (5 attempts / 15 min) and `password-change:<userId>` for password changes, with the counter cleared on success so a few typos don't lock someone out. It's intentionally simple (a `Map` in the Node process) and the code says so in its own comment: on a single instance it's fine, but if this ever ran as multiple instances behind a load balancer each instance would keep separate counters, effectively multiplying the limit — the fix there is a shared store (Redis, or a table in the existing MySQL DB).

**Q: I noticed the password-change route returns 400 for "wrong current password" instead of 401 — why?**
- A: Because that route is already session-authenticated and called through `authFetch()`, which treats *any* 401 as "access token expired, refresh and silently retry." If a wrong current password returned 401, the client would interpret it as an expired token, transparently refresh, and retry the exact same request — burning an extra rate-limit attempt and hiding the real error from the user. Reserving 401 strictly for "your session itself is invalid" and using 400 for "your request was rejected for a business reason" keeps that retry logic from misfiring.

**Q: Are the JWT secrets and DB credentials hardcoded?**
- A: No — both `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (`lib/auth.ts`) and the DB connection (`lib/db.ts`) read from `process.env`/`.env.local`, thrown as a clear error at call time if missing rather than crashing the whole server at import time. *(Note to self: an earlier project doc of mine says these were hardcoded — that's now stale; I fixed it since. Good example of a real "found and paid down a security smell" story if asked for one.)*

---

## 5. State management: Redux cart + RTK Query

**Say this out loud:**
> "There are two separate pieces of client state, deliberately not unified: cart is a plain Redux Toolkit slice (`cartSlice.ts`), and auth is React Context (`AuthContext.tsx`), not Redux. Cart is genuinely global, cross-page, persisted client state — Redux fits. Auth is more like 'the result of an async check plus a couple of callbacks' — Context with a `checked` flag models that more directly than fitting it into Redux's action/reducer shape would. Separately, order *data* (guest tracking, active orders) is fetched through RTK Query, which is the one place this app uses `createApi` — I picked it specifically for its polling support."

**Q: How does the cart handle a menu item vs. a build-your-own box differently?**
- A: Regular items are keyed by their product `id` — re-adding the same donut increments quantity in place (`addItem` in `cartSlice.ts` merges by `id` when there's no `boxID`). Boxes are keyed by a separate, per-instance `boxID`, so someone can add three 6-donut boxes with three different fillings and they stay as three separate cart rows, each independently editable (`updateItemByBoxID`, `removeBoxItem`) or removable without touching the others. That split exists because "sameness" means something different for the two product types: two chocolate donuts are interchangeable; two boxes with different contents are not.

**Q: Where does the cart live, and what happens on login/logout?**
- A: `localStorage`, keyed per identity — `cart_<userId>` or `cart_guest` — wired up in `app/providers.tsx`. It only rehydrates once `AuthContext`'s `checked` flag is `true`, specifically to avoid loading the wrong person's cart (or flashing an empty one) before the very first `/api/me` check has resolved.

**Q: Why doesn't the cart just trust its own numbers at checkout?**
- A: Because client state is never authoritative for money. `POST /api/orders` re-resolves every cart line against the database (see [section 8](#8-security--the-server-side-trust-boundary)) and recomputes the subtotal/shipping/total itself — the cart's job is UX, not pricing.

**Q: What is RTK Query actually buying you over a `useEffect` + `fetch` + `useState`?**
- A: Mainly the polling primitive. `useTrackOrderQuery`/`useGetActiveOrdersQuery` take a `pollingInterval` option and RTK Query manages the repeat-fetch timer, caching, and re-render for you — including `skipPollingIfUnfocused` (pause polling in a backgrounded tab) and `refetchOnFocus`/`refetchOnReconnect` (via `setupListeners` in `store.ts`). Hand-rolling that with `useEffect` + `setInterval` is doable but I'd be reimplementing cache dedup, cleanup-on-unmount, and focus/reconnect handling myself.

**Q: Why does the guest tracking page stop polling sometimes?**
- A: `app/track/page.tsx` sets `pollingInterval` to `0` once the order reaches a terminal status (`completed`/`cancelled`) or the lookup errors — otherwise it'd keep hitting the server every 15s forever for an order that will never change again.

**Q: Why does `getActiveOrders` filter to non-terminal orders in SQL instead of just fetching everything and filtering client-side?**
- A: Because this endpoint polls on a fixed interval for as long as the active-orders page is open. If filtering happened client-side, every single poll would re-transfer and re-parse the customer's *entire* order history — which only grows over time — just to throw most of it away. Filtering server-side (`fetchOrderHistory(userId, { activeOnly: true })` in `lib/orders.ts`, adding `AND status NOT IN ('completed','cancelled')` to the SQL) means each poll only pays for what's actually still active.

---

## 6. Database design

**Say this out loud:**
> "There's one `products` table for donuts, drinks, *and* boxes — `category_id` says which, and `capacity` (NULL vs 3/6/12) distinguishes a box from a regular item. Boxes have no predefined contents; what a customer put in a specific box is stored per-order in `order_item_box_contents`, linked to that order's line item, not to the product. `orders` snapshots the shipping address directly onto the row instead of just pointing at a saved address, so editing or deleting a saved address later doesn't rewrite history."

**Q: Why one `products` table instead of separate `donuts`/`drinks`/`boxes` tables?**
- A: They share almost every column — name, description, price, image, active flag, category — and `order_items.product_id` needs to point at *any* purchasable thing uniformly. Splitting them would mean either a polymorphic FK (messy) or three separate join paths through order history for what's conceptually "one line item." `capacity` as a nullable discriminator column keeps one table, one FK path, and lets `category_id` still answer "what kind of product is this" cleanly.

**Q: Why not give boxes a fixed set of contents like a normal product?**
- A: Because the whole point of a "build your own box" is that the contents are chosen per purchase, not fixed at the catalog level. Modeling it as "the box product has no contents; the *order item* does" is the accurate reflection of that — `order_item_box_contents.order_item_id` ties a set of donut choices to one specific box someone bought, so two customers (or two boxes in the same cart) can have entirely different fillings without touching the product catalog at all.

**Q: Why snapshot the shipping address onto the order instead of just storing an `address_id`?**
- A: If I only stored a foreign key to `addresses` and the customer later edited or deleted that saved address, every past order referencing it would silently show the *new* (or missing) address — which is wrong; an order should always show where it actually shipped. Copying `shipping_name`/`shipping_line1`/etc. onto the `orders` row at checkout time makes each order an accurate historical record, independent of what happens to the saved address afterward.

**Q: How do you avoid N+1 queries when loading a customer's order history with all its line items and box contents?**
- A: `lib/orders.ts`'s `fetchOrderHistory()` does it in exactly three queries regardless of how many orders/items there are: (1) the user's orders, (2) all `order_items` for those order ids in one `IN (...)` query, (3) all `order_item_box_contents` for those item ids in one more `IN (...)` query — then stitches everything together in JS with `Map`s keyed by order id / order item id. `GET /api/orders` and `GET /api/orders/active` both call this same function with different options rather than forking their own copy of the join logic.

**Q: Where do you use a transaction, and why?**
- A: `POST /api/orders` — inserting the `orders` row, then one `order_items` row per line, then (for boxes) `order_item_box_contents` rows, all need to succeed together or not at all. It calls `db.getConnection()` to pin all those statements to one specific connection (rather than `db.query()`, which grabs *any* free connection from the pool per call — a `BEGIN` on one connection and an `INSERT` on another wouldn't be part of the same transaction to MySQL), wraps them in `beginTransaction()`/`commit()`, `rollback()`s on any error, and always `release()`s the connection in a `finally` so the pool doesn't leak connections.

**Q: Any subtlety in the schema you'd point out?**
- A: `tags` (free-form badges like "bestseller"/"fruit") are explicitly separate from `categories` (donut/drink/box) — the schema comments spell out that categories answer "what kind of product is this" and tags answer "what extra label does it have," which is an easy pair of concepts to accidentally conflate. Also `products.is_active` is a soft-hide flag, not a delete — a discontinued product stays in the table so historical orders that reference it still resolve correctly.

---

## 7. Order lifecycle, cron, and "live" tracking

**Say this out loud:**
> "Order status is a small state machine — `preparing → out_for_delivery → completed` (or `cancelled`) — driven entirely by timestamps, not by any in-request logic. Placing an order sets `ready_at` and `delivery_due_at` a fixed number of minutes in the future. A tiny standalone script (`scripts/cron-worker.mjs`) runs a `CronJob` every 30 seconds and calls `GET /api/cron/update-orders` with a bearer-token secret; that route runs `lib/advanceOrders.ts`, which is just two `UPDATE ... WHERE <timestamp> <= NOW()` statements. Nothing else in the app moves order status — if that worker isn't running, orders just sit in `preparing` forever."

**Q: Why a polling cron worker instead of a proper job queue, or websockets pushing status updates?**
- A: For this project's scale, a single scheduled endpoint is simpler to reason about and deploy (one extra long-running Node process) than standing up a queue (BullMQ/Redis) or a websocket server. The client side mirrors that same "polling is good enough" choice — the tracking pages use RTK Query's `pollingInterval` rather than a websocket subscription. The honest limitation is horizontal scaling: this is a single-instance design (see [section 10](#10-honest-answers-what-would-you-improve)) for both the cron worker and the in-memory rate limiter.

**Q: There's a comment in `advanceOrders.ts` about ordering the two `UPDATE`s deliberately — what's that about?**
- A: It completes `out_for_delivery → completed` orders *before* advancing `preparing → out_for_delivery` ones, in that order, on purpose. If both an order's `ready_at` and `delivery_due_at` have already passed by the time a tick runs (e.g. the worker was down for a while, or `preparingMins`/`deliveryMins` are set very short for demo purposes), doing the preparing→out_for_delivery update first would mean that order could get completed in the very next tick, skipping the point where a user would ever actually observe "out for delivery" — running completions first, then advancing preparing orders, keeps every order visible in each status for at least one tick.

**Q: Why is the cron endpoint protected by a bearer secret instead of just being public?**
- A: Because calling it advances real state (order statuses) — it's a mutation, not a read, and it should only ever be triggered by the one worker that's supposed to call it, not by anyone who finds the URL. `Authorization: Bearer <CRON_SECRET>` (read from `.env.local`, unlike the JWT secrets this one was never hardcoded) is a minimal shared-secret check appropriate for a single trusted caller.

**Q: How does order tracking differ for a guest vs. a logged-in customer, and why two routes instead of one?**
- A: Guest tracking (`/track` page → `GET /api/orders/track`, public/unauthenticated) looks up `WHERE id = ? AND shipping_phone = ?` — the phone number acts as a shared secret instead of gating by login, since a guest has no session to check. Logged-in tracking (`/account/active-orders` → `GET /api/orders/active`) is session-gated and scoped to `user_id` server-side. I kept them as two routes on purpose: the guest route intentionally has *no* user scoping (that's the whole point — it's how a guest without an account can check their order), and merging it with the account route would mean carefully re-adding that exact scoping distinction inside one endpoint instead of it being structurally obvious from having two.

---

## 8. Security & the server-side trust boundary

**Say this out loud:**
> "The rule I followed everywhere the client sends data that affects money or identity: never trust it, always re-resolve it against the database. The clearest example is checkout — the cart sends `{ id, name, price, quantity, contents }` per item, and the server ignores the client's price entirely, re-looking-up every product by id → box capacity → name (in that fallback order), and recalculating subtotal/shipping/total itself from the DB's canonical price."

**Q: Walk me through `resolveProductId`'s three-strategy fallback — why three?**
- A: Strategy 1 (numeric id lookup) covers the normal case where the client sent a real DB id. Strategy 2 (box capacity: 3/6/12) covers box items, where matching by capacity within the "boxes" category is more robust than trusting whatever id the client's box-builder UI attached. Strategy 3 (name match) is a last-resort fallback. If none of the three resolve, the whole item — and the request — is rejected with a 400 rather than silently guessing. The point isn't really "three chances to succeed," it's "however this product got identified on the client, verify it independently against the DB before charging for it."

**Q: How are box orders validated — could someone order a box with the wrong number of donuts, or sneak a box inside a box?**
- A: Two checks: the number of selected donuts must exactly equal the box's `capacity` (reject otherwise — no partially-filled or over-filled boxes), and each chosen donut id is independently re-verified to belong to the `"donuts"` category (`resolveDonutProductIdsforBox`) — so a manipulated request claiming a box product id as a "donut" inside another box is rejected, not silently accepted.

**Q: Guest checkout means `user_id` can be NULL on an order — what stops that from being abused?**
- A: Nothing prevents *placing* a guest order (that's intentional — guest checkout is a supported flow), but a guest can't act on someone else's data: guest orders are only ever looked up later via the `id` + `shipping_phone` pair (the tracking route), never listed by browsing. For logged-in checkout, if `addressId` is supplied the server verifies `WHERE id = ? AND user_id = ?` before using it — so a logged-in user can't ship to (or leak the existence of) another user's saved address by guessing its id.

**Q: How is SQL injection prevented, given there's no ORM?**
- A: Every query uses `?` placeholders with values passed as a separate array to `db.query(sql, [values])` — `mysql2` escapes them; nothing user-supplied is ever string-concatenated into SQL. The one place a value is interpolated directly into a query string is `advanceOrders.ts`'s date-math (`DATE_ADD(NOW(), INTERVAL ${preparingSecs} SECOND)`) and `fetchOrderHistory`'s `statusFilter` — both are fixed literals chosen by the server's own code branching (never derived from request input), which is a meaningfully different (and safe) case from interpolating a client-supplied value.

**Q: What's the actual XSS/CSRF story for the auth cookies?**
- A: Both tokens are `httpOnly` (unreadable from JS, so a hypothetical XSS can't just read `document.cookie` and steal them) and `sameSite: "lax"` (cookie isn't sent on most cross-site requests, which covers the common CSRF vector for state-changing `POST`s triggered from another site), plus `secure` in production (HTTPS-only transmission). What I *don't* have is an explicit CSRF token — `sameSite: lax` covers a lot of the practical risk for this app's request shapes, but a stricter implementation (or `sameSite: strict` where UX allows it) would be the next hardening step if this went further than a portfolio project.

---

## 9. UI system

**Say this out loud:**
> "Tailwind for styling, shadcn/ui for primitives (button, tabs, etc. — copied into `components/ui/*`, not installed as an opaque dependency, so I can edit them directly), and a split between generic UI primitives (`components/ui`) and app-specific composed components (`app/components`). `BoxBuilder.tsx` and `CartBar.tsx` are the two components I treat as the visual/interaction reference for everything else — new UI is supposed to match their spacing, animation, and component patterns rather than each screen inventing its own."

**Q: Why shadcn/ui instead of a component library like MUI or Chakra?**
- A: shadcn isn't a runtime dependency — it generates the component source directly into `components/ui`, so I own and can freely restyle every primitive without fighting a library's theming API or shipping CSS I don't control. For a project where visual identity (rose/amber donut-shop palette, a specific density/spacing pass) mattered, owning the components outright was worth the trade-off of not getting automatic upstream updates.

**Q: What's an example of a real interaction detail you had to get right, not just "make it look nice"?**
- A: `BoxBuilder`'s modal locks `document.body.style.overflow = "hidden"` while open and restores the previous value on close/unmount — otherwise the page behind the modal scrolls along with it on mobile, which is a common "looks fine on desktop, breaks on a phone" bug. It also distinguishes `build`/`edit`/`remove` modes explicitly (rather than inferring intent from props), since editing an existing box's contents and building a fresh one need different initial state and different dispatch actions (`updateItemByBoxID` vs. adding a new cart entry).

**Q: Tell me about the header/density pass mentioned in your project notes.**
- A: That was a deliberate compactness pass across header-style blocks (icon/eyebrow/title/description rows) — tightening container padding, dropping a title size step, shrinking or conditionally hiding descriptive copy below `sm`, but *sizing icons up* while tightening surrounding padding so it reads as compact without shrinking tap targets. It's a good example of a UI change that's about density and information hierarchy, not just "make things smaller" — a couple of those moves (bigger icon, tighter frame) are counter-intuitive if you're only thinking "compact = smaller everywhere."

---

## 10. Honest answers: "what would you improve?"

These are real, current rough edges — good material for "tell me about some technical debt" or "what would you do differently," because they're specific and I can talk about *why* each one is the way it is, not just that it's wrong.

- **Duplicate scratch files.** `app/api/login/route copy.ts`, `app/api/me/route copy.ts`, `app/api/register/route copy.ts`, and `app/components/Section copy.tsx` are stale copies sitting alongside the real files, not imported anywhere. Harmless today, but exactly the kind of thing that causes a future "wait, which file did I actually edit?" mistake — should be deleted (or a `git log` check to confirm nothing depends on them, then deleted).
- **The 401→refresh→retry pattern is implemented three times** (`AuthContext.revalidate`, `authFetch.ts`, `orderApi.ts`'s `baseQueryWithReauth`) instead of once, because each call site has a different shape (a Context effect, a raw `fetch` wrapper, an RTK Query `BaseQueryFn`). A shared low-level retry utility they all call into would remove the duplication.
- **Heavy `console.log` debug instrumentation**, especially in `cartSlice.ts` and various API routes — currently intentional (left in as debug logging), but in a real production app I'd gate it behind a debug flag or swap to a structured logger so it doesn't ship to production consoles / stdout by default.
- **No automated tests.** Nothing under the repo currently exercises the checkout price-resolution logic, the cart's box-instance semantics, or `advanceOrders`'s ordering guarantee — all three are exactly the kind of logic that's easy to silently break on a refactor and hard to notice by eye. Given more time, those three are where I'd put unit tests first, since they're the highest-value/least-obvious-when-broken pieces.
- **In-memory rate limiter doesn't scale horizontally.** `lib/rateLimit.ts` is explicit about this in its own comments: fine for one instance, but multiple instances behind a load balancer would each keep separate counters, silently multiplying the effective limit. Fix is a shared store (Redis, or a table in the existing MySQL DB).
- **No real payment gateway.** `payment_method`/`payment_reference`/`payment_last4`/`payment_meta` model what a real integration (Stripe, etc.) would need, but checkout doesn't call an actual processor — it's a believable simulation, not a working charge. That's a deliberate scope cut for a portfolio project, not an oversight, but worth naming directly if asked "does this actually take payments."
- **No schema migration tooling.** `db/schema.sql` is a single drop-and-recreate script, not a sequence of versioned migrations — fine for a project with one environment I fully control, but it means there's no safe way to evolve the schema against data I care about keeping. A tool like Prisma Migrate or plain numbered `.sql` migration files would be the next step.
- **User-facing errors sometimes use `alert()`** (e.g. `BoxBuilder`'s "All N slots are full") instead of inline UI feedback — functional, but not consistent with the rest of the app's design language, and blocks the UI thread while it's open.
- **Single point of failure on the cron worker.** It's one Node process with no supervision/restart story described in the repo beyond "run it." If it crashes, order statuses just stop advancing silently — worth pairing with a process manager (or moving the schedule into the hosting platform's own cron feature) so a crash is visible and self-healing.

---

## 11. System design / whiteboard extensions

Likely "how would you extend this" prompts, using the actual codebase as the starting point rather than a blank slate.

**Q: How would you move from polling to real-time order status updates?**
- A: Two options depending on constraints. (1) Server-Sent Events: keep the same one-way "server tells client the status" shape this app already has conceptually (polling *is* one-way already), just push instead of pull — the cron worker's `advanceOrders()` could publish to connected SSE clients instead of (or alongside) waiting for the next poll. (2) WebSockets if I also wanted bidirectional messaging (e.g. live chat with a driver). Given this app's actual need is "tell the client when status changes," SSE is the smaller change from what exists — RTK Query even supports subscribing a cache entry to a stream instead of polling it.

**Q: How would you make this handle real payments?**
- A: Swap the `payment` block in `POST /api/orders` for a real flow: create a Payment Intent with Stripe (or similar) *before* the order is finalized, confirm it client-side, and only write the `orders` row (currently one transaction) once the webhook confirms `payment_intent.succeeded` — meaning the order-creation transaction would need to move from "happens synchronously in the checkout request" to "happens once payment is confirmed," likely via a webhook handler that does the same `resolveProductId`/transaction logic that's currently inline in the POST route. I'd also want idempotency keys so a retried webhook doesn't double-create an order.

**Q: How would you scale the cron worker / rate limiter to multiple instances?**
- A: For the cron worker: move the schedule off a standalone always-running script and either (a) use the hosting platform's native cron/scheduled-job feature (so there's exactly one trigger regardless of how many app instances are running), or (b) keep a worker but add a DB-level lock (e.g. `SELECT ... FOR UPDATE` on a single "lock row," or an advisory lock) so if two instances ever both fire, only one actually runs `advanceOrders()`. For the rate limiter: swap the in-memory `Map` for Redis (`INCR` + `EXPIRE` is the standard pattern) or a MySQL table with a unique key per bucket — both already discussed in the code's own comments as the intended next step.

**Q: This models a single shop — how would you extend it to multiple locations/inventory?**
- A: `products` would need to stop being globally available and become scoped per-location — either a `location_id` on `products` (if catalogs differ per shop) or a separate `inventory` table keyed by `(location_id, product_id)` with a quantity/availability flag (if the catalog is shared but stock isn't). Orders would gain a `location_id` too (which shop is fulfilling this), and the box-builder's donut list would need to query "donuts available at this order's location" instead of "all donuts," which changes `resolveDonutProductIdsforBox`'s query to also filter by location.

**Q: How would you add search or filtering at a larger catalog size?**
- A: At the current scale (a single shop's menu), a straight `WHERE`/`LIKE` query against `products` is fine. If the catalog grew significantly, I'd reach for MySQL full-text search first (least new infrastructure) before introducing a dedicated search service like Elasticsearch/Meilisearch — the latter's worth it once you need fuzzy matching, faceted filtering (by tag, category, price range) at speed, or relevance ranking beyond what SQL comfortably expresses.

**Q: What would you add for observability if this were a real production app?**
- A: Structured logging (replace the ad-hoc `console.log`/`console.error` calls with something like pino that tags severity/route/request-id) plus an error-tracking service (Sentry) wired into the API routes' existing `catch` blocks — right now a 500 just logs server-side and returns a generic JSON error, with no aggregation or alerting if, say, the DB pool starts failing.

---

## 12. Rapid-fire cheat sheet

| Ask | One-line answer |
|---|---|
| Access token lifetime | 15 minutes, httpOnly cookie |
| Refresh token lifetime | 7 days, httpOnly cookie, hash stored in `users.refresh_token_hash` for revocation |
| Why two JWT libraries | `jsonwebtoken` (Node, API routes) + `jose` (edge-compatible, `middleware.ts`) — same secret, two runtimes |
| Where auth state lives client-side | React Context (`AuthContext`), not Redux — cart is Redux, auth isn't |
| Cart identity for normal items | Keyed by product `id`; re-adding merges quantity |
| Cart identity for boxes | Keyed by a separate `boxID` per instance — independent contents, independent edit/remove |
| Cart persistence | `localStorage`, per-identity key (`cart_<userId>` / `cart_guest`), rehydrated only after auth `checked === true` |
| Who determines final order price | The server, always — client-sent price is ignored; re-resolved from `products.price` |
| Product/box/drink modeling | One `products` table; `capacity` NULL = donut/drink, 3/6/12 = box |
| Where box contents live | `order_item_box_contents`, per order item — not on the product |
| Why address is copied onto orders | So editing/deleting a saved address later doesn't rewrite past orders |
| N+1 avoidance for order history | 3 batched queries (`fetchOrderHistory` in `lib/orders.ts`), stitched in JS |
| Order status driver | Timestamps (`ready_at`, `delivery_due_at`) + a cron-triggered `UPDATE`, nothing else advances status |
| Cron mechanism | `cron` npm package, 30s tick, hits `GET /api/cron/update-orders` with a bearer secret |
| Why complete-before-advance ordering in `advanceOrders` | Prevents a slow tick from skipping `out_for_delivery` entirely in one pass |
| Guest order tracking auth | `orderId` + `shipping_phone` as a shared secret — no session needed |
| Logged-in active orders | Session-gated, filtered to non-terminal status **in SQL**, not client-side, because it polls |
| SQL injection prevention | Parameterized `?` queries everywhere; the few string-interpolated values are server-chosen literals, never request input |
| Rate limiting | In-memory fixed-window `Map`, per-IP+email (login) / per-user (password change) — explicitly noted as not horizontally scalable |
| Biggest deliberate scope cut | No real payment gateway — fields model a real integration, but nothing actually charges a card |
