import { NextResponse } from "next/server";
import { fetchTrackedOrder } from "@/lib/orders";

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
