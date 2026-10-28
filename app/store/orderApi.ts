import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { isTerminalStatus } from "@/lib/orderStatus";

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

      async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (typeof EventSource === "undefined") return;

        try {
          await cacheDataLoaded;
        } catch {
          return;
        }

        const params = new URLSearchParams({ orderId: arg.orderId, phone: arg.phone });
        const source = new EventSource(`/api/orders/track/stream?${params.toString()}`);

        source.onmessage = (event) => {
          const order = JSON.parse(event.data) as TrackedOrder;
          updateCachedData((draft) => {
            Object.assign(draft, order);
          });

          if (isTerminalStatus(order.status)) {
            source.close();
          }
        };

        source.addEventListener("not-found", () => {
          source.close();
        });

        source.addEventListener("stream-error", () => {
          source.close();
        });

        await cacheEntryRemoved;
        source.close();
      },
    }),

    getActiveOrders: builder.query<AccountOrder[], void>({
      query: () => "orders/active",
      transformResponse: (response: { orders: AccountOrder[] }) => response.orders,
      providesTags: ["ActiveOrders"],

      async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (typeof EventSource === "undefined") return;

        try {
          await cacheDataLoaded;
        } catch {
          return;
        }

        const connection: { source: EventSource | null; torndown: boolean } = {
          source: null,
          torndown: false,
        };

        function connect() {
          const source = new EventSource("/api/orders/active/stream");
          connection.source = source;

          source.onmessage = (event) => {
            const orders = JSON.parse(event.data) as AccountOrder[];
            updateCachedData(() => orders);

            if (orders.length === 0) {
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

          source.addEventListener("stream-error", () => {
            source.close();
            connection.source = null;
          });
        }

        function handleActiveOrdersChanged() {
          if (!connection.torndown && !connection.source) {
            connect();
          }
        }

        window.addEventListener(ACTIVE_ORDERS_CHANGED_EVENT, handleActiveOrdersChanged);

        connect();

        await cacheEntryRemoved;
        connection.torndown = true;
        connection.source?.close();
        window.removeEventListener(ACTIVE_ORDERS_CHANGED_EVENT, handleActiveOrdersChanged);
      },
    }),
  }),
});

export const { useTrackOrderQuery, useGetActiveOrdersQuery } = orderApi;
