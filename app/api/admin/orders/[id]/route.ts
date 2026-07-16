import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ORDER_STATUSES } from "@/lib/orderStatus";

const allowedStatuses = new Set<string>(ORDER_STATUSES);

// Milestone timestamps are stamped once on first entry into each status.
const timestampFields: Record<string, string | null> = {
  preparing:        null,
  out_for_delivery: "shipped_at",
  completed:        "completed_at",
  cancelled:        "cancelled_at",
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

    // For milestone statuses we record the first time the order entered that stage.
    const timestampField = timestampFields[status];
    if (timestampField) {
      query += `, ${timestampField} = COALESCE(${timestampField}, NOW())`;
    }

    // When an admin manually promotes a COD order to preparing, schedule the
    // advancement timestamps so the cron job can auto-advance it from here.
    // A default of 10 min prep + 30 min delivery is used since we don't have item data here.
    if (status === "preparing") {
      query += ", ready_at = COALESCE(ready_at, DATE_ADD(NOW(), INTERVAL 10 MINUTE))";
      query += ", delivery_due_at = COALESCE(delivery_due_at, DATE_ADD(NOW(), INTERVAL 40 MINUTE))";
    }

    // We intentionally perform a single targeted update rather than a read-then-write
    // round trip to keep the admin action fast and simple.
    query += " WHERE id = ?";
    values.push(orderId);

    const [result]: any = await db.query(query, values);

    if (!result?.affectedRows) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, orderId, status }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
