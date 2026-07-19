// /store/orderApi.ts
//
// ---------------------------------------------------------------------------
// What this file is for
// ---------------------------------------------------------------------------
// This is an RTK Query "API slice" — a self-contained piece of Redux state
// that knows how to fetch order data, cache it, and (this is the important
// part for this project) automatically refetch it on a timer so the UI
// updates as the cron worker (scripts/cron-worker.mjs -> lib/advanceOrders.ts)
// flips an order's status from "preparing" -> "out_for_delivery" -> "completed".
//
// createApi() below doesn't fetch anything by itself. It builds a small
// object (`orderApi`) containing a reducer, a middleware, and a set of
// auto-generated React hooks (`useTrackOrderQuery`, `useGetActiveOrdersQuery`).
// Two things elsewhere make it actually work:
//   1. app/store/store.ts adds `orderApi.reducer` + `orderApi.middleware` to
//      the Redux store, so its cache lives alongside the `cart` slice.
//   2. Whatever component calls the hooks (app/track/page.tsx for guests,
//      app/account/active-orders/page.tsx for logged-in users) passes a
//      `pollingInterval` option, which is what actually triggers the repeat
//      fetches. Without a caller passing pollingInterval, this file just
//      does a normal one-shot fetch-and-cache like a regular fetch() call.
// ---------------------------------------------------------------------------

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

// ---------------------------------------------------------------------------
// Response types
//
// These mirror the JSON shapes the API routes already return (see
// app/api/orders/track/route.ts and app/api/orders/route.ts). RTK Query needs
// them so `useTrackOrderQuery()`/`useGetActiveOrdersQuery()` come back typed
// instead of `any`, the same way a hand-written fetch + useState<T> would.
// ---------------------------------------------------------------------------

// One line item on an order (a donut, drink, or box). `boxContents` is only
// non-empty when this item is a box (`capacity` is not null).
export type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  capacity: number | null;
  boxContents: Array<{ name: string; quantity: number }>;
};

// Shape returned by GET /api/orders/track (guest lookup by order id + phone).
export type TrackedOrder = {
  id: number;
  status: string;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  items: OrderItem[];
};

// Shape returned by GET /api/orders (logged-in user's order history). It's
// everything TrackedOrder has, plus payment/note fields the guest tracking
// endpoint doesn't expose.
export type AccountOrder = TrackedOrder & {
  payment_method: string | null;
  payment_last4: string | null;
  customer_note: string | null;
};

// What a caller must pass into useTrackOrderQuery() — both fields are
// required because the API route treats them as a shared secret
// (WHERE id = ? AND shipping_phone = ?), see app/api/orders/track/route.ts.
export type TrackOrderArgs = { orderId: string; phone: string };

// ---------------------------------------------------------------------------
// Base query
//
// A "base query" is RTK Query's version of a fetch() wrapper — every
// endpoint below eventually calls this to actually hit the network.
// fetchBaseQuery() is RTK's built-in wrapper around the browser's fetch();
// baseUrl: "/api" means each endpoint only needs to specify the path after
// that (e.g. "orders/track" -> fetch("/api/orders/track")).
// ---------------------------------------------------------------------------
const rawBaseQuery = fetchBaseQuery({ baseUrl: "/api" });

// Access tokens expire after 15 minutes (see lib/auth.ts, signAccessToken).
// The getActiveOrders query below polls in the background for as long as the
// account/active-orders page stays open, so it's very possible for that
// 15-minute window to pass mid-session. Plain fetchBaseQuery would just start
// returning 401s forever at that point — the user would see their live order
// list silently freeze without any error shown.
//
// baseQueryWithReauth wraps rawBaseQuery to fix that, mirroring the exact
// same pattern app/api/authFetch.ts already uses for regular page fetches:
//   1. Try the request normally.
//   2. If it comes back 401 (access token expired/invalid), POST
//      /api/refresh once. That route reads the refreshToken cookie (7-day
//      lifetime) and, if valid, sets a fresh accessToken cookie.
//   3. If the refresh succeeded, retry the original request exactly once
//      (now with a valid cookie). If the refresh itself failed (refresh
//      token also expired), just return the original 401 and let the UI
//      show it as an error like it would for any other failed request.
//
// BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> is the type
// createApi() expects for its `baseQuery` option — "accepts either a url
// string or a FetchArgs object, returns unknown data or a
// FetchBaseQueryError". Declaring it explicitly here (rather than inferring)
// is what lets this function be dropped straight into createApi() below.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  // Step 1: attempt the request the caller actually asked for.
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Step 2: our access token is dead — try to mint a new one. This reuses
    // rawBaseQuery (not fetch() directly) purely for consistency/error
    // shape; it's a one-off POST, not something we want cached or retried.
    const refreshResult = await rawBaseQuery({ url: "refresh", method: "POST" }, api, extraOptions);

    // Step 3: only retry if the refresh actually worked. If it didn't
    // (refresh token expired too, or the user was logged out elsewhere),
    // `result` still holds the original 401 and we fall through to return it.
    if (!refreshResult.error) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// The API slice itself
//
// createApi() takes this config object and generates:
//   - orderApi.reducer / orderApi.middleware   (wired up in store.ts)
//   - orderApi.endpoints.trackOrder / .getActiveOrders (low-level access)
//   - useTrackOrderQuery / useGetActiveOrdersQuery     (the hooks components use)
// ---------------------------------------------------------------------------
export const orderApi = createApi({
  // Redux state for this slice lives at `state.orderApi` — matches the key
  // store.ts uses when it does `reducer: { ..., [orderApi.reducerPath]: orderApi.reducer }`.
  reducerPath: "orderApi",
  baseQuery: baseQueryWithReauth,
  // refetchOnFocus: if the browser tab was backgrounded and the user tabs
  // back in, RTK Query refetches any currently-subscribed query once. Paired
  // with setupListeners(store.dispatch) in store.ts, which is what actually
  // wires up the window "focus"/"visibilitychange" listeners this depends on.
  refetchOnFocus: true,
  // Same idea but for the browser's online/offline events — refetch once the
  // network comes back after a drop.
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    // -------------------------------------------------------------------
    // trackOrder — GET /api/orders/track?orderId=&phone=
    //
    // Used by the guest-facing /track page (app/track/page.tsx). Public,
    // unauthenticated endpoint — no cookies/session involved, which is why
    // 401 handling above is irrelevant to this particular query in practice
    // (it just never gets one; the route returns 400/404 instead).
    //
    // builder.query<ReturnType, ArgType> — ReturnType is what components
    // see as `data`; ArgType is what they pass when calling the hook, e.g.
    // `useTrackOrderQuery({ orderId: "12", phone: "555-1234" })`.
    // -------------------------------------------------------------------
    trackOrder: builder.query<TrackedOrder, TrackOrderArgs>({
      // `query` builds the request from the hook's argument. Returning an
      // object (instead of a plain url string) lets us pass `params`, which
      // fetchBaseQuery serializes into a query string itself
      // (?orderId=12&phone=555-1234) — no manual URLSearchParams needed.
      query: ({ orderId, phone }) => ({
        url: "orders/track",
        params: { orderId, phone },
      }),
      // The route responds with { order: {...} }. transformResponse unwraps
      // that so `data` in the component is the order directly, not
      // `data.order` everywhere it's used.
      transformResponse: (response: { order: TrackedOrder }) => response.order,
    }),

    // -------------------------------------------------------------------
    // getActiveOrders — GET /api/orders/active
    //
    // Used by the logged-in account "active orders" page
    // (app/account/active-orders/page.tsx). Session-gated (reads the
    // accessToken cookie server-side via getSession()) — the server figures
    // out *which* user's orders to return from the cookie, so no params are
    // needed here. `void` as the arg type means the hook takes no
    // arguments: `useGetActiveOrdersQuery()`.
    //
    // Unlike app/account/orders/page.tsx (order *history*, which hits plain
    // GET /api/orders and wants everything), this hits a dedicated route
    // that filters to non-completed/non-cancelled orders in SQL
    // (lib/orders.ts, fetchOrderHistory(userId, { activeOnly: true })).
    // Doing the filtering server-side — instead of fetching the customer's
    // entire order history here and discarding the finished ones in
    // transformResponse — matters because this query polls on an interval:
    // filtering client-side would mean re-transferring and re-parsing the
    // full history (which only grows over time) on every single poll.
    // -------------------------------------------------------------------
    getActiveOrders: builder.query<AccountOrder[], void>({
      query: () => "orders/active",
      // The route responds with { orders: [...] }; unwrap it the same way
      // trackOrder unwraps { order: {...} } above.
      transformResponse: (response: { orders: AccountOrder[] }) => response.orders,
    }),
  }),
});

// createApi() auto-generates one `use<EndpointName>Query` hook per endpoint
// above (capitalized). Destructuring them here means callers do
// `import { useTrackOrderQuery } from "@/app/store/orderApi"` instead of
// reaching into `orderApi.endpoints.trackOrder.useQuery`.
//
// How a component actually gets "live" updates out of these:
//   const { data, error, isFetching } = useTrackOrderQuery(args, { pollingInterval: 15000 })
// RTK Query starts a setInterval-like timer (paused when the tab is hidden
// if skipPollingIfUnfocused is also set) that re-runs the same request every
// 15s and updates `data` in place — the component just re-renders with the
// new status, no manual fetch-and-setState loop required. See
// app/track/page.tsx and app/account/active-orders/page.tsx for how the
// pollingInterval is chosen (and, on the track page, turned off once the
// order reaches a terminal status).
export const { useTrackOrderQuery, useGetActiveOrdersQuery } = orderApi;
