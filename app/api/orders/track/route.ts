import { NextResponse } from "next/server";
import { fetchTrackedOrder } from "@/lib/orders";

// ---------------------------------------------------------------------------
// GET /api/orders/track?orderId=&phone=
// Guest-facing order lookup: no session involved. The order id + the phone
// number given at checkout together act as a shared secret (see
// fetchTrackedOrder in lib/orders.ts for the actual query, including the
// advance-on-read status sweep that now runs before every read instead of
// relying on the external cron worker).
//
// This is the one-shot fetch the /track page's RTK Query `trackOrder`
// endpoint calls first, for an immediate first paint. Live updates after
// that come from GET /api/orders/track/stream (SSE) instead of polling this
// route on a timer — see app/store/orderApi.ts's onCacheEntryAdded.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = Number(searchParams.get("orderId"));
    const phone = (searchParams.get("phone") ?? "").trim();

    if (!Number.isInteger(orderId) || orderId <= 0 || !phone) {
      return NextResponse.json({ error: "Order number and phone are required" }, { status: 400 });
    }

    const order = await fetchTrackedOrder(orderId, phone);

    if (!order) {
      return NextResponse.json({ error: "No order found for that order number and phone" }, { status: 404 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err) {
    console.error("GET /api/orders/track error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
