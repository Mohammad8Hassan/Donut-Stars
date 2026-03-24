"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/app/api/authFetch";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  capacity: number | null;
  boxContents: Array<{ name: string; quantity: number }>;
};

type Order = {
  id: number;
  status: string;
  payment_method: string | null;
  payment_last4: string | null;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  customer_note: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  items: OrderItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "paid":
      return "bg-sky-50 text-sky-700 border border-sky-200";
    case "shipped":
      return "bg-violet-50 text-violet-700 border border-violet-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

function formatPaymentMethod(method: string | null) {
  if (!method) {
    return null;
  }

  return toTitleCase(method);
}

function formatCardDigits(last4: string | null) {
  if (!last4) {
    return null;
  }

  return last4.slice(-3);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await authFetch("/api/orders", { cache: "no-store" });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to load orders.");
        }

        const data = await res.json();
        setOrders(data.orders ?? []);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-pink-300 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-purple-300 opacity-20 blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="black" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="mx-auto max-w-4xl py-10 px-4 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Previous Orders</h1>
          <p className="text-sm text-gray-600">Review your recent donut runs and delivery details.</p>
        </div>

        {loading ? <div className="bg-white border shadow-sm rounded-xl p-6 text-sm text-gray-500">Loading orders...</div> : null}
        {!loading && error ? <div className="bg-white border shadow-sm rounded-xl p-6 text-sm text-red-600">{error}</div> : null}

        {!loading && !error && orders.length === 0 ? (
          <div className="bg-white border shadow-sm rounded-xl p-6">
            <p className="text-gray-600 text-sm">You have no past orders yet.</p>
          </div>
        ) : null}

        {!loading && !error
          ? orders.map((order) => {
              const paymentMethod = formatPaymentMethod(order.payment_method);
              const lastThreeDigits = formatCardDigits(order.payment_last4);
              const addressParts = [order.shipping_line1, order.shipping_city, order.shipping_postal_code, order.shipping_country]
                .filter(Boolean)
                .join(", ");

              return (
                <section key={order.id} className="bg-white border shadow-sm rounded-xl p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Order #{order.id}</p>
                      <h2 className="text-lg font-semibold">Placed {formatDate(order.created_at)}</h2>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-medium w-fit ${getStatusBadgeClasses(order.status)}`}>
                      {toTitleCase(order.status)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-gray-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery</p>
                      <p className="mt-2 font-medium text-gray-900">{order.shipping_name}</p>
                      {order.shipping_phone ? <p className="text-sm text-gray-600">{order.shipping_phone}</p> : null}
                      <p className="mt-1 text-sm text-gray-600">{addressParts}</p>
                    </div>

                    <div className="rounded-lg border bg-gray-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</p>
                      {paymentMethod ? <p className="mt-2 text-sm text-gray-700">Method: <span className="font-medium text-gray-900">{paymentMethod}</span></p> : null}
                      {lastThreeDigits ? <p className="text-sm text-gray-700">Card ending in <span className="font-medium text-gray-900">{lastThreeDigits}</span></p> : null}
                      {!paymentMethod && !lastThreeDigits ? <p className="mt-2 text-sm text-gray-600">No payment details stored for this order.</p> : null}
                    </div>
                  </div>

                  {order.customer_note ? (
                    <div className="rounded-lg border bg-amber-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Order Note</p>
                      <p className="mt-2 text-sm text-amber-900">{order.customer_note}</p>
                    </div>
                  ) : null}

                  <div className="border rounded-lg divide-y">
                    {order.items.map((item) => (
                      <div key={item.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-1">
                          <p className="font-medium text-gray-900">{item.quantity}x {item.name}</p>
                          {item.capacity !== null && item.boxContents.length > 0 ? (
                            <p className="text-sm text-gray-600">
                              Filled with {item.boxContents.map((donut) => `${donut.quantity}x ${donut.name}`).join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium text-gray-700">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 text-sm text-gray-600 sm:justify-items-end">
                    <p>Subtotal: <span className="font-medium text-gray-900">{formatCurrency(order.subtotal)}</span></p>
                    <p>Shipping: <span className="font-medium text-gray-900">{formatCurrency(order.shipping)}</span></p>
                    <p className="text-base">Total: <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span></p>
                  </div>
                </section>
              );
            })
          : null}
      </div>
    </>
  );
}
