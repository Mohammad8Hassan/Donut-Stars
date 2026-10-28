"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { getStatusBadgeClasses, getStatusLabel, isTerminalStatus } from "@/lib/orderStatus";
import { useTrackOrderQuery, type TrackOrderArgs } from "@/app/store/orderApi";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string") {
      return (data as any).error;
    }
  }
  return "Failed to find that order.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function TrackOrderForm() {
  const searchParams = useSearchParams();

  const [orderId, setOrderId] = useState(searchParams.get("orderId") ?? "");
  const [phone, setPhone] = useState("");
  const [submittedArgs, setSubmittedArgs] = useState<TrackOrderArgs | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: order,
    error: queryError,
    isLoading,
  } = useTrackOrderQuery(submittedArgs ?? skipToken);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedOrderId = orderId.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedOrderId || !trimmedPhone) {
      setFormError("Enter both your order number and phone.");
      return;
    }

    setFormError(null);
    setSubmittedArgs({ orderId: trimmedOrderId, phone: trimmedPhone });
  }

  const loading = submittedArgs ? isLoading : false;
  const error = formError ?? (submittedArgs && queryError ? getErrorMessage(queryError) : null);
  const isLive = Boolean(submittedArgs && order && !isTerminalStatus(order.status) && !queryError);

  const addressParts = order
    ? [order.shipping_line1, order.shipping_city, order.shipping_postal_code, order.shipping_country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[32px] border border-rose-100 bg-white/85 shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Track your order</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
              Enter your order number and the phone number you gave at checkout to see its status.
            </p>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Order number</span>
              <input
                inputMode="numeric"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 1024"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-rose-300"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Phone number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone used at checkout"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-rose-300"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? "Searching..." : "Track"}
            </button>
          </div>

          {error && <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </form>

        {order && (
          <section className="rounded-[32px] border border-zinc-200 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Order #{order.id}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">Placed {formatDate(order.created_at)}</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                {isLive && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live — updates automatically
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Delivery</p>
              <p className="mt-3 text-base font-semibold text-zinc-950">{order.shipping_name}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{addressParts}</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-200">
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
                    {item.capacity !== null && item.boxContents.length > 0 && (
                      <p className="text-sm leading-6 text-zinc-600">
                        Filled with {item.boxContents.map((donut) => `${donut.quantity}x ${donut.name}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-700">{formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 rounded-[24px] bg-zinc-950 px-5 py-4 text-sm text-white/70 sm:justify-items-end">
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

            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="h-4 w-4" />
              Only visible to whoever knows the order number and phone number on file.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderForm />
    </Suspense>
  );
}
