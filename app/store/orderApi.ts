import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";


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
    }),

    getActiveOrders: builder.query<AccountOrder[], void>({
      query: () => "orders/active",
      transformResponse: (response: { orders: AccountOrder[] }) => response.orders,
      providesTags: ["ActiveOrders"],
    }),
  }),
});

export const { useTrackOrderQuery, useGetActiveOrdersQuery } = orderApi;
