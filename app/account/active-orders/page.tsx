"use client";

import { AccountCard, AccountSectionHeading } from "@/app/components/account/AccountUi";
import OrderStatusAnimation from "@/app/components/OrderStatusAnimation";
import { getStatusLabel, getStatusBadgeClasses } from "@/lib/orderStatus";
import { useGetActiveOrdersQuery } from "@/app/store/orderApi";

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

function formatPaymentMethod(method: string | null) {
  if (!method) return null;
  return method.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCardDigits(last4: string | null) {
  if (!last4) {
    return null;
  }

  return last4.slice(-3);
}

export default function ActiveOrdersPage() {
  // Live updates come from the SSE subscription in orderApi.ts's
  // onCacheEntryAdded (opened/closed automatically as this query is
  // subscribed/unsubscribed) — no pollingInterval needed here anymore.
  const {
    data: orders = [],
    isLoading,
    error,
  } = useGetActiveOrdersQuery();

  const errorMessage = error ? "Failed to load your active orders." : null;

  return (
    <div className="flex flex-col gap-4">
      <AccountCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <AccountSectionHeading
            title="Active orders"
            description="Orders that are still preparing or on their way. This list updates automatically as their status changes."
          />
          {!isLoading && !errorMessage ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
              {/* Pulses continuously while the SSE subscription is open — "connected",
                  not "just updated" (there's no longer a per-poll isFetching moment). */}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live — updates automatically
            </span>
          ) : null}
        </div>
      </AccountCard>

      {isLoading ? (
        <AccountCard>
          <p className="text-sm text-zinc-500">Loading active orders...</p>
        </AccountCard>
      ) : null}

      {!isLoading && errorMessage ? (
        <AccountCard>
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </AccountCard>
      ) : null}

      {!isLoading && !errorMessage && orders.length === 0 ? (
        <AccountCard>
          <AccountSectionHeading
            title="Nothing in progress right now"
            description="Orders that are preparing or out for delivery will show up here the moment you place them."
          />
        </AccountCard>
      ) : null}

      {!isLoading && !errorMessage
        ? orders.map((order) => {
            const paymentMethod = formatPaymentMethod(order.payment_method);
            const lastThreeDigits = formatCardDigits(order.payment_last4);
            const addressParts = [order.shipping_line1, order.shipping_city, order.shipping_postal_code, order.shipping_country]
              .filter(Boolean)
              .join(", ");

            return (
              <AccountCard key={order.id}>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Order #{order.id}</p>
                      <h3 className="mt-1 text-lg font-black leading-tight tracking-tight text-zinc-950">
                        Placed {formatDate(order.created_at)}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <OrderStatusAnimation status={order.status} size="md" />
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Delivery</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-950">{order.shipping_name}</p>
                      {order.shipping_phone ? <p className="text-xs text-zinc-600">{order.shipping_phone}</p> : null}
                      <p className="mt-1 text-xs leading-5 text-zinc-600">{addressParts}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Payment</p>
                      {paymentMethod ? (
                        <p className="mt-1 text-xs text-zinc-700">
                          Method: <span className="font-semibold text-zinc-950">{paymentMethod}</span>
                        </p>
                      ) : null}
                      {lastThreeDigits ? (
                        <p className="text-xs text-zinc-700">
                          Card ending in <span className="font-semibold text-zinc-950">{lastThreeDigits}</span>
                        </p>
                      ) : null}
                      {!paymentMethod && !lastThreeDigits ? (
                        <p className="mt-1 text-xs text-zinc-600">No payment details stored for this order.</p>
                      ) : null}
                    </div>
                  </div>

                  {order.customer_note ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Order note</p>
                      <p className="mt-1 text-xs leading-5 text-amber-950">{order.customer_note}</p>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-2xl border border-zinc-200">
                    {order.items.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between ${
                          index !== order.items.length - 1 ? "border-b border-zinc-200" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-semibold text-zinc-950">
                            {item.quantity}x {item.name}
                          </p>
                          {item.capacity !== null && item.boxContents.length > 0 ? (
                            <p className="text-xs leading-5 text-zinc-600">
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

                  <div className="grid gap-1 rounded-2xl bg-zinc-950 px-4 py-3 text-sm text-white/70 sm:justify-items-end">
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
