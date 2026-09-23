import type { TrackOrderArgs } from "@/app/store/orderApi";


const GUEST_ORDERS_KEY = "guestOrders";
const MAX_GUEST_ORDERS = 5;

export const GUEST_ORDERS_CHANGED_EVENT = "guestOrdersChanged";

function notifyGuestOrdersChanged(): void {
  window.dispatchEvent(new Event(GUEST_ORDERS_CHANGED_EVENT));
}

function isTrackOrderArgs(value: unknown): value is TrackOrderArgs {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as TrackOrderArgs).orderId === "string" &&
    typeof (value as TrackOrderArgs).phone === "string"
  );
}

export function getGuestOrders(): TrackOrderArgs[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(GUEST_ORDERS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isTrackOrderArgs);
  } catch {
    return [];
  }
}

export function addGuestOrder(orderId: string, phone: string): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getGuestOrders().filter((o) => o.orderId !== orderId);
    const next = [{ orderId, phone }, ...existing].slice(0, MAX_GUEST_ORDERS);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(next));
    notifyGuestOrdersChanged();
  } catch {
    // localStorage unavailable (private mode, quota, etc.)
  }
}

export function removeGuestOrder(orderId: string): void {
  if (typeof window === "undefined") return;

  try {
    const next = getGuestOrders().filter((o) => o.orderId !== orderId);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(next));
    notifyGuestOrdersChanged();
  } catch {
    
  }
}
