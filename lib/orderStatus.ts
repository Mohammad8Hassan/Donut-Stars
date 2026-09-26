export const ORDER_STATUSES = [
  "preparing",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_STATUSES = new Set<string>(["completed", "cancelled"]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

// How long a just-finished order keeps showing up in "active" views (the
// navbar strip, /account/active-orders) after hitting a terminal status, so
// the completed/cancelled treatment in OrderStatusAnimation actually gets
// seen instead of the order disappearing the instant it finishes. Mirrors
// how delivery apps keep a "Delivered" order in the live-tracking list for a
// bit before it rolls into history. Used both as the SQL grace window
// (lib/orders.ts) and, doubled to milliseconds, as the client-side linger
// delay for the guest flow (ActiveOrdersStrip.tsx).
export const TERMINAL_STATUS_GRACE_SECONDS = 120;

export function getStatusLabel(status: string): string {
  switch (status) {
    case "preparing":        return "Preparing";
    case "out_for_delivery": return "Out for Delivery";
    case "completed":        return "Completed";
    case "cancelled":        return "Cancelled";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "preparing":        return "bg-orange-50 text-orange-700 border border-orange-200";
    case "out_for_delivery": return "bg-violet-50 text-violet-700 border border-violet-200";
    case "completed":        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "cancelled":        return "bg-rose-50 text-rose-700 border border-rose-200";
    default:                 return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}
