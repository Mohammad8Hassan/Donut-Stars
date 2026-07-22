export const ORDER_STATUSES = [
  "preparing",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Statuses that never advance further (see lib/advanceOrders.ts) — used to
// stop polling and to prune resolved orders out of guest/navbar tracking.
export const TERMINAL_STATUSES = new Set<string>(["completed", "cancelled"]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

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
