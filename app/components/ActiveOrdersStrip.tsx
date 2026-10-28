"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useGetActiveOrdersQuery, useTrackOrderQuery, type TrackOrderArgs } from "../store/orderApi";
import { GUEST_ORDERS_CHANGED_EVENT, getGuestOrders, removeGuestOrder } from "@/lib/guestOrders";
import { getStatusLabel, isTerminalStatus, TERMINAL_STATUS_GRACE_SECONDS } from "@/lib/orderStatus";
import OrderStatusAnimation from "./OrderStatusAnimation";

const TERMINAL_LINGER_MS = TERMINAL_STATUS_GRACE_SECONDS * 1000;

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
  if (status === "completed")
    return "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_14px_30px_rgba(16,185,129,0.14)] hover:shadow-[0_18px_38px_rgba(16,185,129,0.2)]";
  if (status === "cancelled")
    return "border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-red-50 shadow-[0_14px_30px_rgba(244,63,94,0.14)] hover:shadow-[0_18px_38px_rgba(244,63,94,0.2)]";
  return "border-zinc-200 bg-white shadow-sm hover:shadow-md";
}

function GuestOrderStatusFetcher({
  order,
  onStatus,
  onResolved,
}: {
  order: TrackOrderArgs;
  onStatus: (orderId: string, status: string) => void;
  onResolved: (orderId: string) => void;
}) {
  const { data, error } = useTrackOrderQuery(order);
  const resolvedRef = useRef(false);
  const lingerTimerSet = useRef(false);
  const lingerTimeoutId = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (resolvedRef.current) return;

    if (error) {
      resolvedRef.current = true;
      onResolved(order.orderId);
      return;
    }

    if (!data) return;

    onStatus(order.orderId, data.status);

    if (isTerminalStatus(data.status) && !lingerTimerSet.current) {
      lingerTimerSet.current = true;
      lingerTimeoutId.current = setTimeout(() => {
        resolvedRef.current = true;
        onResolved(order.orderId);
      }, TERMINAL_LINGER_MS);
    }
  }, [data, error, order.orderId, onStatus, onResolved]);

  useEffect(() => {
    return () => {
      if (lingerTimeoutId.current) clearTimeout(lingerTimeoutId.current);
    };
  }, []);

  return null;
}

function OrderCard({
  entry,
  expandable,
  expanded,
  onToggleExpand,
}: {
  entry: ActiveOrderEntry;
  expandable: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full border py-[0.5] pl-3 pr-1.5 transition hover:-translate-y-0.5 ${getAccentClasses(entry.status)}`}
    >
      <Link href={entry.href} className="flex items-center gap-2">
        <OrderStatusAnimation status={entry.status} size="lg" />
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Order No. {entry.orderId}
          </span>
          <span className="text-sm font-black text-zinc-900 sm:text-base">{getStatusLabel(entry.status)}</span>
        </div>
      </Link>
      {expandable && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label="View other active orders"
          aria-haspopup="true"
          aria-expanded={expanded}
          className="ml-0.5 shrink-0 rounded-full p-1.5 text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
        >
          <ChevronDown
            className={`h-4 w-4 transition [@media(hover:hover)]:group-hover:rotate-180 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

export default function ActiveOrdersStrip() {
  const { user, checked } = useAuth();
  const isGuest = checked && !user;

  const [guestOrders, setGuestOrders] = useState<TrackOrderArgs[]>([]);
  const [guestStatuses, setGuestStatuses] = useState<Record<string, string>>({});

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
  const hasRest = rest.length > 0;

  const stripRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!hasRest) setExpanded(false);
  }, [hasRest]);

  useEffect(() => {
    if (!expanded) return;

    function handleOutsideTap(event: MouseEvent | TouchEvent) {
      if (stripRef.current && !stripRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideTap);
    document.addEventListener("touchstart", handleOutsideTap);
    return () => {
      document.removeEventListener("mousedown", handleOutsideTap);
      document.removeEventListener("touchstart", handleOutsideTap);
    };
  }, [expanded]);

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
        <div ref={stripRef} className="group relative">
          <OrderCard
            entry={primary}
            expandable={hasRest}
            expanded={expanded}
            onToggleExpand={() => setExpanded((current) => !current)}
          />

          {hasRest && (
            <div
              className={`absolute right-0 top-full z-10 mt-2 w-64 origin-top-right rounded-2xl border
                border-zinc-200 bg-white/95 p-2 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur
                transition-all duration-150 [@media(hover:hover)]:group-hover:visible
                [@media(hover:hover)]:group-hover:opacity-100
                ${expanded ? "visible opacity-100" : "invisible opacity-0"}`}
            >
              <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Other active orders
              </p>
              {rest.map((entry) => (
                <Link
                  key={entry.key}
                  href={entry.href}
                  onClick={() => setExpanded(false)}
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
