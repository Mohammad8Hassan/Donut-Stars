"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { CheckCircle2, MapPin, PartyPopper, Receipt, ShoppingBag } from "lucide-react";

import { authFetch } from "@/app/api/authFetch";
import { useAuth } from "@/app/context/useAuth";
import { PageLoader } from "@/app/components/PageLoader";
import { getStatusBadgeClasses, getStatusLabel } from "@/lib/orderStatus";
import { useTrackOrderQuery, type AccountOrder, type TrackedOrder } from "@/app/store/orderApi";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

// Logged-in lookup: a one-shot GET /api/orders (full history, same route
// app/account/orders/page.tsx uses) filtered down to the id in the URL —
// unlike active-orders, this still finds the order once it's completed.
function useAccountOrder(orderId: string | null, enabled: boolean) {
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch("/api/orders", { cache: "no-store" });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to load your order.");
        }

        const data = await res.json();
        const orders = (data.orders ?? []) as AccountOrder[];
        const match = orders.find((candidate) => String(candidate.id) === orderId) ?? null;

        if (!cancelled) {
          setOrder(match);
          if (!match) setError("We couldn't find that order on your account.");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load your order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, enabled]);

  return { order, loading, error };
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const phone = searchParams.get("phone");

  const { user, checked } = useAuth();
  const isGuest = checked && !user;

  const accountLookup = useAccountOrder(orderId, checked && !isGuest);

  // Guest lookup reuses the same public endpoint /track uses — a one-shot
  // fetch (no pollingInterval) since this page is a confirmation snapshot,
  // not a live-tracking view. Guests are pointed to /track for that.
  const {
    data: trackedOrder,
    isFetching: trackFetching,
    error: trackError,
  } = useTrackOrderQuery(isGuest && orderId && phone ? { orderId, phone } : skipToken);

  // A guest link only resolves order details when it carries both orderId and
  // phone (see the redirect built in app/payment/page.tsx). Missing phone
  // isn't a failed lookup — no lookup was attempted — so it gets its own message.
  const missingGuestPhone = isGuest && !!orderId && !phone;

  const order: AccountOrder | TrackedOrder | null = isGuest ? trackedOrder ?? null : accountLookup.order;
  const loading = !checked || (isGuest ? Boolean(orderId && phone) && trackFetching && !trackedOrder : accountLookup.loading);
  const loadError = missingGuestPhone
    ? "Enter your phone number on the tracking page to view this order."
    : isGuest
      ? trackError
        ? "We couldn't find that order."
        : null
      : accountLookup.error;

  const trackHref = isGuest
    ? `/track${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`
    : "/account/active-orders";

  const addressParts = order
    ? [order.shipping_line1, order.shipping_city, order.shipping_postal_code, order.shipping_country]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white/85 shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex items-center gap-3 bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-3 sm:px-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_16px_34px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-600">Order confirmed</p>
              <h1 className="mt-1 text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">
                Thank you for your order!
              </h1>
              <p className="mt-1 hidden text-xs leading-5 text-zinc-600 sm:block">
                {orderId ? `Order #${orderId} is confirmed — we're getting it ready.` : "We're getting it ready."}
              </p>
            </div>
          </div>
        </section>

        {!orderId && (
          <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <PartyPopper className="mx-auto h-8 w-8 text-rose-500" strokeWidth={2.1} />
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Your order was placed successfully. Check your order history for the details.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/menu"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
              >
                Browse Menu
              </Link>
            </div>
          </section>
        )}

        {orderId && loading && (
          <section className="rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <PageLoader title="Loading your order" message="Hang tight while we pull up the details." />
          </section>
        )}

        {orderId && !loading && loadError && (
          <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm leading-6 text-zinc-600">
              Your order was placed successfully, but we couldn&apos;t load its details here.
            </p>
            <p className="mt-1 text-xs text-zinc-500">{loadError}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href={trackHref}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
              >
                {isGuest ? "Track your order" : "View active orders"}
              </Link>
              <Link
                href="/menu"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:bg-rose-50"
              >
                Browse Menu
              </Link>
            </div>
          </section>
        )}

        {orderId && !loading && !loadError && order && (
          <>
            <section className="rounded-[28px] border border-zinc-200 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Order #{order.id}</p>
                  <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-zinc-950">
                    Placed {formatDate(order.created_at)}
                  </h2>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
                <div className="flex items-center gap-2 text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Delivery</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-950">{order.shipping_name}</p>
                <p className="text-xs leading-5 text-zinc-600">{addressParts}</p>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
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
                      {item.capacity !== null && item.boxContents.length > 0 && (
                        <p className="text-xs leading-5 text-zinc-600">
                          Filled with {item.boxContents.map((donut) => `${donut.quantity}x ${donut.name}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-1 rounded-2xl bg-zinc-950 px-4 py-3 text-sm text-white/70 sm:justify-items-end">
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
            </section>

            <section className="rounded-[28px] border border-zinc-950/10 bg-zinc-950 p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.28)]">
                  <Receipt className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">What&apos;s next</p>
                  <h2 className="mt-1 text-lg font-black leading-tight tracking-tight">
                    We&apos;ll keep it moving from here
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-300">
                    {isGuest
                      ? "Save your order number and phone to track its status any time."
                      : "Follow live status updates from your account."}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={trackHref}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400"
                >
                  {isGuest ? "Track this order" : "View active orders"}
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Keep Shopping
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
