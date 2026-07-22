import type { TrackOrderArgs } from "@/app/store/orderApi";

// Guests have no session to key an "active orders" list off of, so instead
// we keep a small local list of orders they've placed (id + the phone number
// used as the shared secret for GET /api/orders/track) so the navbar widget
// (app/components/ActiveOrdersStrip.tsx) can track them without a login.
// Written to on successful guest checkout (app/payment/page.tsx).
const GUEST_ORDERS_KEY = "guestOrders";
const MAX_GUEST_ORDERS = 5;

// The native "storage" event only fires in *other* tabs/documents, never the
// one that made the change — so ActiveOrdersStrip (already mounted in the
// navbar when a guest checkout completes) wouldn't otherwise know a new
// order was just added until something else caused it to re-render. This
// custom event fires in the same tab too, so the strip can pick it up
// immediately instead of waiting for the next poll or a navigation.
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
    // localStorage unavailable (private mode, quota, etc.) — tracking this
    // order in the navbar is a nice-to-have, not worth surfacing an error for.
  }
}

export function removeGuestOrder(orderId: string): void {
  if (typeof window === "undefined") return;

  try {
    const next = getGuestOrders().filter((o) => o.orderId !== orderId);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(next));
    notifyGuestOrdersChanged();
  } catch {
    // See addGuestOrder.
  }
}
