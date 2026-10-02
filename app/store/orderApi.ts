import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { isTerminalStatus } from "@/lib/orderStatus";

// Dispatched (same tab only, mirrors GUEST_ORDERS_CHANGED_EVENT in
// lib/guestOrders.ts) right after a logged-in checkout succeeds — see
// app/payment/page.tsx. getActiveOrders' onCacheEntryAdded below listens
// for this to reopen its SSE connection if it had gone idle-closed; see
// that endpoint's comment for why a plain React remount can't do this job
// (ActiveOrdersStrip keeps a permanent subscription for the whole logged-in
// session, so the cache entry/connection never naturally tears down just
// because the order list emptied out).
export const ACTIVE_ORDERS_CHANGED_EVENT = "activeOrdersChanged";


export type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  capacity: number | null;
  boxContents: Array<{ name: string; quantity: number }>;
};

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

export type AccountOrder = TrackedOrder & {
  payment_method: string | null;
  payment_last4: string | null;
  customer_note: string | null;
};

export type TrackOrderArgs = { orderId: string; phone: string };

const rawBaseQuery = fetchBaseQuery({ baseUrl: "/api" });

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshResult = await rawBaseQuery({ url: "refresh", method: "POST" }, api, extraOptions);

    if (!refreshResult.error) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};


export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithReauth,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["ActiveOrders"],
  endpoints: (builder) => ({
    trackOrder: builder.query<TrackedOrder, TrackOrderArgs>({
      query: ({ orderId, phone }) => ({
        url: "orders/track",
        params: { orderId, phone },
      }),
      transformResponse: (response: { order: TrackedOrder }) => response.order,

      // -----------------------------------------------------------------
      // Live updates via SSE, replacing the old client-side pollingInterval
      // entirely. `query` above still runs once up front (fast first
      // paint, and it's what turns a bad orderId/phone into the normal
      // 404 error state); onCacheEntryAdded then takes over pushing
      // updates into that same cache entry for as long as any component
      // is actually subscribed to this exact {orderId, phone} pair.
      //
      // See app/api/orders/track/stream/route.ts for the server side: it
      // re-checks the order every few seconds *only* while this connection
      // is open, and closes itself once the order goes terminal — so an
      // idle tracked order costs nothing on either end once nobody's
      // watching or once it's done.
      // -----------------------------------------------------------------
      async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (typeof EventSource === "undefined") return;

        try {
          await cacheDataLoaded;
        } catch {
          // Initial fetch itself failed (e.g. "no order found" 404) —
          // nothing to stream in that case, so don't open a connection.
          return;
        }

        const params = new URLSearchParams({ orderId: arg.orderId, phone: arg.phone });
        const source = new EventSource(`/api/orders/track/stream?${params.toString()}`);

        source.onmessage = (event) => {
          const order = JSON.parse(event.data) as TrackedOrder;
          updateCachedData((draft) => {
            Object.assign(draft, order);
          });

          // EventSource auto-reconnects on ANY connection close it didn't
          // itself initiate via .close() — including the clean close the
          // stream route does once an order goes terminal. Without this,
          // a finished order zombie-loops forever: the browser reconnects
          // every ~3-4s, immediately gets the same terminal snapshot back,
          // gets closed again, and reconnects again — this is exactly what
          // was showing up as a repeating Network tab entry long after the
          // order (and even its navbar grace period) had finished.
          if (isTerminalStatus(order.status)) {
            source.close();
          }
        };

        source.addEventListener("not-found", () => {
          source.close();
        });

        // Same zombie-reconnect risk on a transient server error — give up
        // rather than let the browser hammer a failing endpoint every few
        // seconds. (Rare in practice; this is defensive.)
        source.addEventListener("stream-error", () => {
          source.close();
        });

        // Resolves the instant nothing is subscribed to this exact
        // {orderId, phone} query anymore (component unmounted, or the user
        // searched a different order/phone) — that's the cue to tear the
        // connection down instead of letting it keep streaming for a page
        // nobody's looking at.
        await cacheEntryRemoved;
        source.close();
      },
    }),

    getActiveOrders: builder.query<AccountOrder[], void>({
      query: () => "orders/active",
      transformResponse: (response: { orders: AccountOrder[] }) => response.orders,
      providesTags: ["ActiveOrders"],

      // -----------------------------------------------------------------
      // Same live-update pattern as trackOrder above, subscribed to
      // GET /api/orders/active/stream instead, with two differences:
      //
      // 1. Reauth: this connection can plausibly stay open longer than the
      //    15-minute access token's lifetime — the server re-checks the
      //    token on every tick and sends a "reauth" event instead of
      //    erroring once it expires, handled here by hitting
      //    POST /api/refresh (same endpoint baseQueryWithReauth above uses
      //    on a 401) and opening a fresh connection.
      //
      // 2. Reconnect-on-new-order: ActiveOrdersStrip keeps this query
      //    subscribed (skip: !checked || !user) for a logged-in user's
      //    *entire* session, regardless of whether they have any active
      //    orders — so unlike trackOrder, there's no natural
      //    mount/unmount moment to reopen a closed connection when a new
      //    order shows up later. The server closes the stream once the
      //    active list is empty (same zombie-reconnect risk as trackOrder
      //    going terminal, guarded against below), and this reopens it by
      //    listening for ACTIVE_ORDERS_CHANGED_EVENT, which
      //    app/payment/page.tsx dispatches right after a logged-in
      //    checkout succeeds.
      // -----------------------------------------------------------------
      async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (typeof EventSource === "undefined") return;

        try {
          await cacheDataLoaded;
        } catch {
          return;
        }

        // An object wrapper rather than a plain `let` — TypeScript widens a
        // closure-captured `let`'s narrowed type unpredictably across the
        // nested `connect()`/event-listener functions below, which isn't
        // worth fighting; a property on an object always keeps its
        // declared type regardless of which function last touched it.
        // `source: null` doubles as "currently idle-closed, OK to
        // reconnect on the next nudge event".
        const connection: { source: EventSource | null; torndown: boolean } = {
          source: null,
          torndown: false,
        };

        function connect() {
          const source = new EventSource("/api/orders/active/stream");
          connection.source = source;

          source.onmessage = (event) => {
            const orders = JSON.parse(event.data) as AccountOrder[];
            // Whole-array replace (not a field-by-field merge like
            // trackOrder's single-object case) — returning a new value
            // from an Immer recipe replaces the draft outright, which is
            // the correct way to swap out an array wholesale.
            updateCachedData(() => orders);

            if (orders.length === 0) {
              // Mirrors trackOrder's terminal-status close above: the
              // server already ends the stream once nothing's active, but
              // only the client calling .close() stops EventSource's
              // automatic reconnect — without this it zombie-loops every
              // ~4s for as long as this (session-long) subscription lives.
              source.close();
              connection.source = null;
            }
          };

          source.addEventListener("reauth", async () => {
            source.close();
            connection.source = null;
            if (connection.torndown) return;

            await fetch("/api/refresh", { method: "POST" });
            if (!connection.torndown) connect();
          });

          // Same zombie-reconnect risk on a transient server error as
          // trackOrder's "stream-error" handling — give up instead of
          // hammering a failing endpoint. A later ACTIVE_ORDERS_CHANGED_EVENT
          // (or the next full page load) will try again.
          source.addEventListener("stream-error", () => {
            source.close();
            connection.source = null;
          });
        }

        // Reopens the connection if it's currently idle-closed (nothing
        // was active) — a no-op if it's already open, since an open
        // connection's own next ~4s tick will pick up the new order anyway.
        function handleActiveOrdersChanged() {
          if (!connection.torndown && !connection.source) {
            connect();
          }
        }

        window.addEventListener(ACTIVE_ORDERS_CHANGED_EVENT, handleActiveOrdersChanged);

        connect();

        // Resolves once the last subscriber to getActiveOrders unmounts
        // (e.g. leaving /account/active-orders, or ActiveOrdersStrip
        // unmounting on logout) — tear the connection down there.
        await cacheEntryRemoved;
        connection.torndown = true;
        connection.source?.close();
        window.removeEventListener(ACTIVE_ORDERS_CHANGED_EVENT, handleActiveOrdersChanged);
      },
    }),
  }),
});

export const { useTrackOrderQuery, useGetActiveOrdersQuery } = orderApi;
