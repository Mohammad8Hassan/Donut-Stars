import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchOrderHistory } from "@/lib/orders";

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
