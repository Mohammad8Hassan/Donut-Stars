import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Only statuses that already exist in the orders schema are accepted here.
const allowedStatuses = new Set(["pending", "paid", "shipped", "completed", "cancelled"]);

// When an order moves into an important lifecycle stage we stamp the corresponding
// timestamp once, preserving the first moment that status was reached.
const timestampFields: Record<string, string | null> = {
  pending: null,
  paid: "paid_at",
  shipped: "shipped_at",
  completed: "completed_at",
  cancelled: "cancelled_at",
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // Route-level authorization remains the real source of protection for admin writes.
  const guard = await requireAdmin();
  if (guard.response) {
    return guard.response;
  }

  const orderId = Number(params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const status = String(body?.status ?? "").trim().toLowerCase();

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    let query = "UPDATE orders SET status = ?";
    const values: Array<string | number> = [status];

    // Promoting an order to paid should also keep payment_status aligned.
    if (status === "paid") {
      query += ", payment_status = 'paid'";
    }

    // For milestone statuses we record the first time the order entered that stage.
    const timestampField = timestampFields[status];
    if (timestampField) {
      query += `, ${timestampField} = COALESCE(${timestampField}, NOW())`;
    }

    // We intentionally perform a single targeted update rather than a read-then-write
    // round trip to keep the admin action fast and simple.
    query += " WHERE id = ?";
    values.push(orderId);

    const [result]: any = await db.execute(query, values);

    if (!result?.affectedRows) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, orderId, status }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
