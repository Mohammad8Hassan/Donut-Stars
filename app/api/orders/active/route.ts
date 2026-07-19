import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchOrderHistory } from "@/lib/orders";

// ---------------------------------------------------------------------------
// GET /api/orders/active
// Returns the logged-in customer's orders that are still in progress (status
// not "completed" or "cancelled"). Used by the account "active orders" page,
// which polls this endpoint on an interval to reflect status changes made by
// the cron worker (lib/advanceOrders.ts) without a manual refresh.
//
// Filtering happens in SQL (fetchOrderHistory's activeOnly option) rather
// than fetching the full order history and filtering client-side, since this
// endpoint is polled repeatedly — a customer with a long order history
// shouldn't pay to re-fetch and re-parse it every poll just to discard most
// of it.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const orders = await fetchOrderHistory(userId, { activeOnly: true });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err) {
    console.error("GET /api/orders/active error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
