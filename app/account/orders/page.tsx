"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/app/api/authFetch";
import { AccountCard, AccountSectionHeading } from "@/app/components/account/AccountUi";

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
    <div className="flex flex-col gap-6">
      {!loading && !error && orders.length > 0 ? (
        <AccountCard>
          <AccountSectionHeading
            title="Previous orders"
            description="Review delivery details, payment info, box contents, and totals from your past orders."
          />
        </AccountCard>
      ) : null}

      {loading ? (
        <AccountCard>
          <p className="text-sm text-zinc-500">Loading orders...</p>
        </AccountCard>
      ) : null}

      {!loading && error ? (
        <AccountCard>
          <p className="text-sm text-rose-600">{error}</p>
        </AccountCard>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <AccountCard>
          <AccountSectionHeading
            title="Your order history will appear here"
            description="Once you place an order, we'll show the items, delivery info, payment summary, and totals in this timeline."
          />
        </AccountCard>
      ) : null}

      {!loading && !error
        ? orders.map((order) => {
            const paymentMethod = formatPaymentMethod(order.payment_method);
            const lastThreeDigits = formatCardDigits(order.payment_last4);
            const addressParts = [order.shipping_line1, order.shipping_city, order.shipping_postal_code, order.shipping_country]
              .filter(Boolean)
              .join(", ");

            return (
              <AccountCard key={order.id}>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Order #{order.id}</p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
                        Placed {formatDate(order.created_at)}
                      </h3>
                    </div>

                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(order.status)}`}>
                      {toTitleCase(order.status)}
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Delivery</p>
                      <p className="mt-3 text-base font-semibold text-zinc-950">{order.shipping_name}</p>
                      {order.shipping_phone ? <p className="mt-1 text-sm text-zinc-600">{order.shipping_phone}</p> : null}
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{addressParts}</p>
                    </div>

                    <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Payment</p>
                      {paymentMethod ? (
                        <p className="mt-3 text-sm text-zinc-700">
                          Method: <span className="font-semibold text-zinc-950">{paymentMethod}</span>
                        </p>
                      ) : null}
                      {lastThreeDigits ? (
                        <p className="mt-1 text-sm text-zinc-700">
                          Card ending in <span className="font-semibold text-zinc-950">{lastThreeDigits}</span>
                        </p>
                      ) : null}
                      {!paymentMethod && !lastThreeDigits ? (
                        <p className="mt-3 text-sm text-zinc-600">No payment details stored for this order.</p>
                      ) : null}
                    </div>
                  </div>

                  {order.customer_note ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Order note</p>
                      <p className="mt-3 text-sm leading-6 text-amber-950">{order.customer_note}</p>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-[24px] border border-zinc-200">
                    {order.items.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between ${
                          index !== order.items.length - 1 ? "border-b border-zinc-200" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-zinc-950">
                            {item.quantity}x {item.name}
                          </p>
                          {item.capacity !== null && item.boxContents.length > 0 ? (
                            <p className="text-sm leading-6 text-zinc-600">
                              Filled with {item.boxContents.map((donut) => `${donut.quantity}x ${donut.name}`).join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-zinc-700">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 rounded-[24px] bg-zinc-950 px-5 py-4 text-sm text-white/70 sm:justify-items-end">
                    <p>
                      Subtotal: <span className="font-semibold text-white">{formatCurrency(order.subtotal)}</span>
                    </p>
                    <p>
                      Shipping: <span className="font-semibold text-white">{formatCurrency(order.shipping)}</span>
                    </p>
                    <p className="text-base">
                      Total: <span className="font-black text-white">{formatCurrency(order.total)}</span>
                    </p>
                  </div>
                </div>
              </AccountCard>
            );
          })
        : null}
    </div>
  );
}
