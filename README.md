# 🍩 Donut Stars

A full-stack donut shop e-commerce app: browse the menu, build your own box, check out, and track your order live. It has a customer account area and an admin dashboard.

**🌐 Live demo: [donutstars.up.railway.app](https://donutstars.up.railway.app/)**

## Features

**Customers**
- Browse the menu of donuts, drinks and pre-sized boxes (3 / 6 / 12), with tags and category filters.
- **Box builder**: pick exactly which donuts go into each box. Several boxes with different contents can sit in the cart at once and be edited independently.
- Persistent cart, saved per user (or per guest) in `localStorage`.
- Checkout with saved addresses. The shipping address is snapshotted onto the order, so order history stays accurate if the address is edited later.
- Registration, login, password change, and order history.
- **Live order tracking** with no polling: status moves `preparing → out_for_delivery → completed` and is pushed to the browser over Server-Sent Events.
- Guest tracking at `/track` using order ID + phone number, with no account needed.

**Admin**
- Role-gated dashboard (`/admin`) for orders and store stats, with charts.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 13 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix primitives), Embla carousel, Recharts |
| State | Redux Toolkit (cart), RTK Query (order tracking), React Context (auth) |
| Database | MySQL via `mysql2` with hand-written, parameterized SQL (no ORM) |
| Auth | JWT access token (15 min) + refresh token (7 days) in cookies; `jose` in edge middleware, `jsonwebtoken` on the server; `bcrypt` for passwords |
| Hosting | Railway (app, MySQL, cron) |

## Engineering highlights

- **Server-trusted checkout.** `POST /api/orders` ignores client-sent prices. It re-resolves every item against the DB by id and recomputes subtotal, shipping and total itself.
- **Advance-on-read order status.** Order statuses are driven by `ready_at` / `delivery_due_at` timestamps and advanced whenever orders are read (`lib/advanceOrders.ts`), so correctness doesn't depend on a background process. This keeps the app safe to run serverless.
- **SSE instead of polling.** `RTK Query` does a one-shot fetch for first paint, then opens an `EventSource` to a `/stream` route that loops server-side and closes itself once there's nothing left to watch. The client also closes the `EventSource` itself, because browsers otherwise auto-reconnect to a cleanly closed stream. Streams that can outlive the access token send a `reauth` event so the client refreshes and reconnects.
- **Single products table.** Donuts, drinks and boxes share one `products` table. A box's chosen contents are stored per order in `order_item_box_contents`.
- **Edge-safe route protection.** `middleware.ts` gates `/admin/*` and `/api/admin/*` by role with `jose`, since the edge runtime can't use `jsonwebtoken`.

## Project structure

```
app/
  api/            Route handlers (auth, orders, SSE streams, admin, cron)
  components/     App-specific components (BoxBuilder, CartBar, ...)
  store/          Redux store: cartSlice, orderApi (RTK Query)
  context/        AuthContext
  menu/ checkout/ payment/ track/ account/ admin/ ...   Pages
components/ui/    shadcn/ui primitives
lib/              DB pool, auth/session, order loading & status logic
db/schema.sql     Full MySQL schema
scripts/          Cron helpers
middleware.ts     Role-based route protection
```

## Running locally

**Prerequisites:** Node.js 20+ and a MySQL 8 instance.

```bash
# 1. Install
npm install

# 2. Create the database and tables
mysql -u <user> -p < db/schema.sql

# 3. Configure environment (see below) in .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local` in the project root:

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=your-database

# Auth
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too

# One-time admin bootstrap (/api/setup/admin)
ADMIN_SETUP_KEY=change-me

# Optional order-status backstop (see scripts/cron-once.mjs)
CRON_SECRET=change-me
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm run cron` | Local always-on worker that hits the order-update endpoint |

## Author

Built by **MOHAMMAD HASSAN**. Feedback and questions are welcome.
