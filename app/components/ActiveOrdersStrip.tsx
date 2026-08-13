"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useGetActiveOrdersQuery, useTrackOrderQuery, type TrackOrderArgs } from "../store/orderApi";
import { GUEST_ORDERS_CHANGED_EVENT, getGuestOrders, removeGuestOrder } from "@/lib/guestOrders";
import { getStatusLabel, isTerminalStatus } from "@/lib/orderStatus";
import OrderStatusAnimation from "./OrderStatusAnimation";

// Ambient "you have an order in flight" widget, always visible in the
// navbar rather than a click-to-open panel (mirrors CartBar's philosophy of
// only rendering when there's something relevant to show).
//
// Logged-in users are backed by GET /api/orders/active (same query the
// account/active-orders page polls). Guests have no session, so they're
// backed by lib/guestOrders.ts, a small localStorage list of {orderId,
// phone} pairs written on successful guest checkout (app/payment/page.tsx).
//
// Only the most recent order gets the big always-visible card; any others
// live in a hover dropdown so the navbar doesn't get crowded.
const POLL_INTERVAL_MS = 15000;

type ActiveOrderEntry = {
  key: string;
  orderId: number | string;
  status: string;
  href: string;
};

function getAccentClasses(status: string): string {
  if (status === "preparing")
    return "border-orange-200/80 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 shadow-[0_14px_30px_rgba(249,115,22,0.16)] hover:shadow-[0_18px_38px_rgba(249,115,22,0.24)]";
  if (status === "out_for_delivery")
    return "border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-[0_14px_30px_rgba(139,92,246,0.14)] hover:shadow-[0_18px_38px_rgba(139,92,246,0.2)]";
  return "border-zinc-200 bg-white shadow-sm hover:shadow-md";
}

// Fetches one guest order's live status and reports it upward — renders
// nothing itself, so the parent can drive a single unified primary-card +
// dropdown UI regardless of whether entries came from the guest
// localStorage list or the logged-in active-orders query.
function GuestOrderStatusFetcher({
  order,
  onStatus,
  onResolved,
}: {
  order: TrackOrderArgs;
  onStatus: (orderId: string, status: string) => void;
  onResolved: (orderId: string) => void;
}) {
  const { data, error } = useTrackOrderQuery(order, { pollingInterval: POLL_INTERVAL_MS });
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current) return;

    if (error || (data && isTerminalStatus(data.status))) {
      resolvedRef.current = true;
      onResolved(order.orderId);
      return;
    }

    if (data) onStatus(order.orderId, data.status);
  }, [data, error, order.orderId, onStatus, onResolved]);

  return null;
}

function OrderCard({ entry, expandable }: { entry: ActiveOrderEntry; expandable: boolean }) {
  return (
    <Link
      href={entry.href}
      className={`flex items-center gap-2.5 rounded-full border px-[0.5] py-[0.5] transition hover:-translate-y-0.5 ${getAccentClasses(entry.status)}`}
    >
      <OrderStatusAnimation status={entry.status} size="lg" />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          Order No. {entry.orderId}
        </span>
        <span className="text-sm font-black text-zinc-900 sm:text-base">{getStatusLabel(entry.status)}</span>
      </div>
      {expandable && <ChevronDown className="ml-0.5 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:rotate-180" />}
    </Link>
  );
}

export default function ActiveOrdersStrip() {
  const { user, checked } = useAuth();
  const isGuest = checked && !user;

  const [guestOrders, setGuestOrders] = useState<TrackOrderArgs[]>([]);
  const [guestStatuses, setGuestStatuses] = useState<Record<string, string>>({});

  // Loaded client-side only (localStorage isn't available during SSR), and
  // reset whenever we're not in the guest state (e.g. right after login).
  // Also re-reads on GUEST_ORDERS_CHANGED_EVENT (fired by lib/guestOrders.ts
  // right after a guest checkout writes a new order, same tab included) and
  // on the native "storage" event (fires in other tabs), so a just-placed
  // order shows up immediately instead of waiting for something else to
  // cause a re-render.
  useEffect(() => {
    if (!isGuest) {
      setGuestOrders([]);
      setGuestStatuses({});
      return;
    }

    setGuestOrders(getGuestOrders());

    function handleChange() {
      setGuestOrders(getGuestOrders());
    }

    window.addEventListener(GUEST_ORDERS_CHANGED_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(GUEST_ORDERS_CHANGED_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [isGuest]);

  const { data: activeOrders = [] } = useGetActiveOrdersQuery(undefined, {
    pollingInterval: POLL_INTERVAL_MS,
    skipPollingIfUnfocused: true,
    skip: !checked || !user,
  });

  function handleGuestStatus(orderId: string, status: string) {
    setGuestStatuses((current) => (current[orderId] === status ? current : { ...current, [orderId]: status }));
  }

  function handleGuestResolved(orderId: string) {
    removeGuestOrder(orderId);
    setGuestOrders((current) => current.filter((o) => o.orderId !== orderId));
    setGuestStatuses((current) => {
      const { [orderId]: _removed, ...rest } = current;
      return rest;
    });
  }

  let entries: ActiveOrderEntry[] = [];

  if (user) {
    entries = activeOrders.map((order) => ({
      key: String(order.id),
      orderId: order.id,
      status: order.status,
      href: "/account/active-orders",
    }));
  } else if (isGuest) {
    entries = guestOrders
      .filter((o) => guestStatuses[o.orderId])
      .map((o) => ({
        key: o.orderId,
        orderId: o.orderId,
        status: guestStatuses[o.orderId],
        href: `/track?orderId=${o.orderId}`,
      }));
  }

  const [primary, ...rest] = entries;

  return (
    <>
      {isGuest &&
        guestOrders.map((order) => (
          <GuestOrderStatusFetcher
            key={order.orderId}
            order={order}
            onStatus={handleGuestStatus}
            onResolved={handleGuestResolved}
          />
        ))}

      {primary && (
        <div className="group relative">
          <OrderCard entry={primary} expandable={rest.length > 0} />

          {rest.length > 0 && (
            <div
              className="invisible absolute right-0 top-full z-10 mt-2 w-64 origin-top-right rounded-2xl border
                border-zinc-200 bg-white/95 p-2 opacity-0 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur
                transition-all duration-150 group-hover:visible group-hover:opacity-100"
            >
              <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Other active orders
              </p>
              {rest.map((entry) => (
                <Link
                  key={entry.key}
                  href={entry.href}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-rose-50"
                >
                  <OrderStatusAnimation status={entry.status} size="sm" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Order No. {entry.orderId}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800">{getStatusLabel(entry.status)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
