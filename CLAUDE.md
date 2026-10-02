@AGENTS.md

# Donut Stars

A donut shop e-commerce site: browse a menu (donuts, drinks, build-your-own boxes), cart, checkout, order tracking, and a customer + admin area. Built with Next.js 13 (Pages-less `app/` router), TypeScript, MySQL, and Redux Toolkit for cart state.

## Stack

- **Framework**: Next.js 13.5.4, App Router, React 18, TypeScript.
- **Styling**: Tailwind CSS + shadcn/ui (`components.json`, style "new-york", base color "neutral"). UI primitives live in `components/ui/*`; app-specific components live in `app/components/*`.
- **State**: Redux Toolkit (`app/store/`) for cart only — auth state lives in React Context (`app/context/AuthContext.tsx`), not Redux.
- **DB**: MySQL via `mysql2/promise` connection pool (`lib/db.ts`). No ORM — all queries are hand-written SQL with `?` placeholders.
- **Auth**: JWT access token (15m) + refresh token (7d) stored as cookies, verified with `jsonwebtoken` (server) and `jose` (middleware, edge-compatible).
- **Cron**: `scripts/cron-once.mjs` runs on Railway's native Cron Schedule, hitting `GET /api/cron/update-orders` once per invocation to auto-advance order status based on timestamps. As of the advance-on-read/SSE work described under "Order status & tracking" below, this is a secondary correctness backstop rather than the primary mechanism — its schedule/removal is still an open decision. `scripts/cron-worker.mjs` (node-cron, `npm run cron`) is the older always-polling local-dev variant of the same thing.

## Canonical UI reference

Per `AGENTS.md`: use [BoxBuilder.tsx](app/components/BoxBuilder.tsx) and [CartBar.tsx](app/components/CartBar.tsx) as the visual/interaction reference for all new UI unless told otherwise — match their spacing, animation, and component patterns.

## Data model (see `db/schema.sql` for full comments)

- **`products`** is the single table for donuts, drinks, *and* boxes. There is no separate boxes table.
  - `category_id` → `categories` (Donuts / Drinks / Boxes).
  - `capacity` is `NULL` for donuts/drinks, and `3`/`6`/`12` for boxes.
  - Boxes have no predefined contents — the customer's chosen donuts are stored per-order in `order_item_box_contents`.
- **`orders`** → **`order_items`** (one row per line item, `product_id` always points at `products`) → **`order_item_box_contents`** (only for box line items; maps a box's `order_item_id` to the donut products + quantities chosen).
- Order status enum: `preparing → out_for_delivery → completed` (or `cancelled`), driven by `ready_at` / `delivery_due_at` timestamps and advanced automatically by `lib/advanceOrders.ts`.
- Shipping address is **snapshotted onto the order** (not just an FK to `addresses`) so historical orders stay accurate if the user edits/deletes saved addresses.
- `tags` are free-form product badges (e.g. "bestseller", "fruit") — distinct from `categories`, which define product type.

## Cart

- Redux slice at `app/store/cartSlice.ts`. Regular items are keyed by `id` (re-adding merges quantity); **box instances are keyed by a separate `boxID`** so multiple boxes with different contents can coexist in the cart and be edited independently.
- Cart is persisted to `localStorage` per identity (`cart_<userId>` or `cart_guest`) via `app/providers.tsx`, and rehydrated once auth state is `checked` — don't add competing persistence logic elsewhere.
- Server-side, `/api/orders` (POST) never trusts client-sent prices or product identity: it re-resolves every item against the DB by numeric id and recalculates the subtotal/shipping/total itself.

## Order status & tracking

- Status enum: `preparing → out_for_delivery → completed` (or `cancelled`), defined in `db/schema.sql` (`orders.status ENUM`) and mirrored in TS as `ORDER_STATUSES`/`OrderStatus` in `lib/orderStatus.ts`, which is also the single source for status labels/badge classes (`getStatusLabel`, `getStatusBadgeClasses`) used by every order-status UI.
- **Advance-on-read, not a background tick.** `lib/advanceOrders.ts`'s `advanceOrders()` runs two unscoped `UPDATE`s driven by timestamps: `preparing → out_for_delivery` once `ready_at <= NOW()`, and `out_for_delivery → completed` once `delivery_due_at <= NOW()` — unscoped meaning no `WHERE id`/`user_id` filter, so one call sweeps *every* pending order in the whole store, not just whichever one triggered it. Every order-read path calls it before returning data: `fetchOrderHistory()` and the new `fetchTrackedOrder()` (both `lib/orders.ts`), so `GET /api/orders`, `GET /api/orders/active`, and `GET /api/orders/track` all self-heal stale statuses on every hit. This is what makes the app safe to run serverless — nothing has to tick in the background for correctness. The SSE routes below (`/api/orders/track/stream`, `/api/orders/active/stream`) call the same sweep on every loop iteration, so one open live-tracking connection advances the whole store's pending orders for as long as it's open, not just the order it's watching. `scripts/cron-once.mjs` (see Stack above) still exists as a backstop for an order nobody ever reads or watches at all (e.g. a guest who checks out and never opens `/track` again) — whether to keep it, and at what frequency, is still an open decision. `cancelled` is not set by this flow (handled elsewhere, e.g. admin).
- **Shared order-loading logic**: `lib/orders.ts` exports `fetchOrderHistory(userId, { activeOnly? })`, a 3-query batch loader (orders → order_items → order_item_box_contents, stitched in JS) used by both `GET /api/orders` (full history) and `GET /api/orders/active` (`activeOnly: true`, adds `AND status NOT IN ('completed','cancelled')` in SQL). Don't fork a new copy of this logic for other order-listing needs — add an option to `fetchOrderHistory` instead.
- **RTK Query layer**: `app/store/orderApi.ts` is the one `createApi` slice in the app (cart still uses a plain `createSlice`, see above), wired into `app/store/store.ts` alongside `cartReducer` (`reducer: { cart, [orderApi.reducerPath]: orderApi.reducer }`, plus `orderApi.middleware` and `setupListeners(store.dispatch)` for `refetchOnFocus`/`refetchOnReconnect`). Its `baseQueryWithReauth` wraps `fetchBaseQuery` to mirror `app/api/authFetch.ts`'s 401 → `POST /api/refresh` → retry-once pattern for the one-shot fetch each endpoint does first. Live updates after that come from SSE, not polling — see below. Two endpoints, one per audience below.

### Guest vs. logged-in tracking flows — SSE, not polling

Both `trackOrder` and `getActiveOrders` (`orderApi.ts`) follow the same two-phase pattern: their `query` does a one-shot fetch for the first paint, then `onCacheEntryAdded` opens an `EventSource` to a matching `/stream` route and merges each pushed frame into that same cache entry until the last subscriber unmounts (`cacheEntryRemoved`) — there is no client-side `pollingInterval` anywhere in the order-tracking UI anymore. Each stream route is a `ReadableStream` that loops server-side (advance-on-read + re-check, every ~4s) for as long as the connection is open, and closes itself — ending that invocation — the moment there's nothing left to usefully watch. That self-termination, combined with advance-on-read above, is what makes this whole flow cheap to run serverless: nothing runs unless a real client is either mid-request or actively watching an order that's still in flight.

- **Guest — `/track` page** (`app/track/page.tsx`): no session involved. The customer supplies `orderId` + `phone`; `GET /api/orders/track` (public, unauthenticated, backed by `fetchTrackedOrder` in `lib/orders.ts`) looks up `WHERE id = ? AND shipping_phone = ?`, treating the phone as a shared secret rather than gating by login. `GET /api/orders/track/stream` is the SSE counterpart (same lookup, same params) — its loop closes once the order reaches a terminal status (`completed`/`cancelled`) or stops matching.
- **Logged-in — `/account/active-orders` page** (`app/account/active-orders/page.tsx`): session-gated. `GET /api/orders/active` / `GET /api/orders/active/stream` — filtering to non-terminal orders (plus the terminal grace window) happens server-side in `fetchOrderHistory`, not client-side, so the stream only pushes a frame when the list actually changes, and closes once it's empty. Because this connection can plausibly outlive the 15-minute access token (unlike a normal request), the stream re-verifies the token every loop tick and sends a `reauth` SSE event if it's expired instead of just erroring — the client (`orderApi.ts`) handles that by calling `POST /api/refresh` and opening a fresh `EventSource`. This is separate from `/account/orders` (`app/account/orders/page.tsx`), which shows full order *history* via a one-shot `authFetch('/api/orders')` with no live updates — active-orders is a live subset view, not a replacement.
- Both flows land on the same visual order-card treatment (status badge via `lib/orderStatus.ts`, line items, box contents) but are backed by different API routes/streams and different identity checks — don't merge them into one endpoint; the guest route intentionally has no session/user_id scoping while the account route intentionally requires one.
- **EventSource auto-reconnects on any server-closed connection — the client must call `.close()` itself, or a stream route "closing once done" zombie-loops.** The browser's native `EventSource` only stops retrying when the client calls `.close()`; a clean `controller.close()` on the server side (the normal exit from both loops above) still reads as a dropped connection to the browser, which reopens it on the default ~3-4s retry, immediately gets the same final snapshot back, and gets closed again — forever. Both `onmessage` handlers in `orderApi.ts` call `source.close()` themselves the instant they see a result that will never change (`isTerminalStatus` for `trackOrder`, an empty array for `getActiveOrders`) — don't add a new stream consumer without the matching explicit close, or it'll silently reintroduce the exact 24/7-polling problem this whole SSE design exists to avoid. `getActiveOrders` additionally needs `ACTIVE_ORDERS_CHANGED_EVENT` (a same-tab `window` event, same pattern as `GUEST_ORDERS_CHANGED_EVENT` in `lib/guestOrders.ts`) because `ActiveOrdersStrip` keeps it subscribed for a user's whole logged-in session regardless of order count — once its stream closes on an empty list there's no natural remount to reopen it, so `app/payment/page.tsx` dispatches that event right after a logged-in checkout succeeds, and the still-alive `onCacheEntryAdded` reconnects on it if currently idle-closed.

## Auth

- `lib/session.ts` / `lib/auth.ts` handle session/user lookups; `middleware.ts` gates `/admin/*` and `/api/admin/*` by role using `jose` (Next middleware runs on the edge runtime, which can't use `jsonwebtoken`).
- `app/context/AuthContext.tsx` drives client-side auth state via `GET /api/me` → on 401, `POST /api/refresh` → retry `/api/me`. Anything gating on auth should wait for `checked === true`, not just `user`, to avoid flashing logged-out UI before the first check resolves.

## Known rough edges (don't "fix" silently — flag before touching)

- **JWT secrets are hardcoded** in `lib/auth.ts` and `lib/session.ts` (`"shhhhh"`, `"shhhhhawy"`) instead of read from env — same secret string is duplicated across files, so an edit to one must be mirrored in both.
- **DB credentials are hardcoded** in `lib/db.ts` (not from env vars), unlike `CRON_SECRET` which correctly comes from `.env.local`.
- Several `route copy.ts` / `Section copy.tsx` files exist alongside their originals (`app/api/login/route copy.ts`, `app/api/me/route copy.ts`, `app/api/register/route copy.ts`, `app/components/Section copy.tsx`) — likely stale scratch copies, not imported anywhere. Confirm before deleting or editing the "original" so you don't edit the wrong one.
- Heavy `console.log` instrumentation throughout `cartSlice.ts` and the API routes — treat as intentional debug logging already in place, not something to clean up unprompted.

## Conventions

- Types shared across client/server live in `types.ts` (`IItem`, `IBoxItem`, `ICartItem`).
- API routes return `{ error: string }` with an appropriate status code on failure, and log server-side with `console.error("<METHOD> <path> error:", err)`.
- SQL is always parameterized with `?` placeholders — never string-concatenate user input into a query.

<!-- TEMP SESSION NOTE — remove this section when no longer needed -->
## [TEMP] Header/tab compactness pass (2026-07-28)

Applied to `app/menu/page.tsx` and `app/components/BoxBuilder.tsx` — follow this density for any other header-style block (icon/eyebrow/title/description rows) unless told otherwise:

- Container padding: `py-4`/`py-5`/`py-6` → `py-1.5`–`py-3` (drop the extra `sm:`/`lg:` step-ups where possible).
- Titles: drop one size step (e.g. `text-2xl sm:text-3xl` → `text-lg sm:text-xl`), add `leading-tight`.
- Descriptions: either fold into the title line, or keep but shrink (`text-xs leading-4`) and hide below `sm` with `hidden sm:block` — don't just delete informative copy outright.
- Icons inside headers/tab triggers: size up, not down (e.g. tab icons `h-5 w-5` → `h-8 w-8`) — bigger icon + tighter surrounding padding reads as compact without shrinking tap targets.
- Stat/eyebrow cards inside headers: `p-4`/`mt-5` gaps → `px-3 py-1.5`/`mt-2`.
- Buttons that only make sense when a collection is non-empty (e.g. a header "Add New X" button when a matching empty-state CTA already exists) should be conditionally rendered on that collection's length, not always shown.
<!-- END TEMP SESSION NOTE -->

