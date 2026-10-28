import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { advanceOrders } from "@/lib/advanceOrders";

type AdminOrderRow = {
  id: number | string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  payment_last4: string | null;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  customer_note: string | null;
  subtotal: number | string;
  shipping: number | string;
  total: number | string;
  created_at: Date | string;
  customer_id: number | string | null;
  customer_name: string | null;
  customer_email: string | null;
};

type OrderItemRow = {
  order_item_id: number | string;
  order_id: number | string;
  quantity: number | string;
  unit_price: number | string;
  product_name: string;
  capacity: number | string | null;
};

type BoxContentRow = {
  order_item_id: number | string;
  quantity: number | string;
  donut_name: string;
};

function makePlaceholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) {
    return guard.response;
  }

  try {
    await advanceOrders();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim().toLowerCase() ?? "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "12"), 1), 100);
    const allowedStatuses = new Set<string>(ORDER_STATUSES);

    const values: Array<string | number> = [];
    let whereClause = "";

    if (status && allowedStatuses.has(status)) {
      whereClause = "WHERE o.status = ?";
      values.push(status);
    }

    values.push(limit);

    const [orders]: any = await db.query(
      `
      SELECT
        o.id,
        o.status,
        o.payment_status,
        o.payment_method,
        o.payment_last4,
        o.shipping_name,
        o.shipping_phone,
        o.shipping_line1,
        o.shipping_city,
        o.shipping_postal_code,
        o.shipping_country,
        o.customer_note,
        o.subtotal,
        o.shipping,
        o.total,
        o.created_at,
        u.id AS customer_id,
        u.name AS customer_name,
        u.email AS customer_email
      FROM orders o
      LEFT JOIN users u
        ON u.id = o.user_id
      ${whereClause}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ?
      `,
      values
    );

    const orderRows = (orders ?? []) as AdminOrderRow[];
    const orderIds = orderRows.map((order) => Number(order.id));

    if (orderIds.length === 0) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const [itemRows]: any = await db.query(
      `
      SELECT
        oi.id AS order_item_id,
        oi.order_id,
        oi.quantity,
        oi.unit_price,
        p.name AS product_name,
        p.capacity
      FROM order_items oi
      INNER JOIN products p
        ON p.id = oi.product_id
      WHERE oi.order_id IN (${makePlaceholders(orderIds.length)})
      ORDER BY oi.order_id DESC, oi.id ASC
      `,
      orderIds
    );

    const normalizedItems = (itemRows ?? []) as OrderItemRow[];
    const orderItemIds = normalizedItems.map((item) => Number(item.order_item_id));
    const boxContentsByOrderItem = new Map<number, Array<{ name: string; quantity: number }>>();

    if (orderItemIds.length > 0) {
      const [boxRows]: any = await db.query(
        `
        SELECT
          oibc.order_item_id,
          oibc.quantity,
          p.name AS donut_name
        FROM order_item_box_contents oibc
        INNER JOIN products p
          ON p.id = oibc.donut_product_id
        WHERE oibc.order_item_id IN (${makePlaceholders(orderItemIds.length)})
        ORDER BY oibc.order_item_id ASC, p.name ASC
        `,
        orderItemIds
      );

      for (const row of (boxRows ?? []) as BoxContentRow[]) {
        const orderItemId = Number(row.order_item_id);
        const existing = boxContentsByOrderItem.get(orderItemId) ?? [];
        existing.push({
          name: row.donut_name,
          quantity: Number(row.quantity),
        });
        boxContentsByOrderItem.set(orderItemId, existing);
      }
    }

    const itemsByOrder = new Map<
      number,
      Array<{
        id: number;
        name: string;
        quantity: number;
        unitPrice: number;
        capacity: number | null;
        boxContents: Array<{ name: string; quantity: number }>;
      }>
    >();

    for (const item of normalizedItems) {
      const orderId = Number(item.order_id);
      const existing = itemsByOrder.get(orderId) ?? [];
      existing.push({
        id: Number(item.order_item_id),
        name: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        capacity: item.capacity === null ? null : Number(item.capacity),
        boxContents: boxContentsByOrderItem.get(Number(item.order_item_id)) ?? [],
      });
      itemsByOrder.set(orderId, existing);
    }

    const payload = orderRows.map((order) => ({
      id: Number(order.id),
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      payment_last4: order.payment_last4,
      shipping_name: order.shipping_name,
      shipping_phone: order.shipping_phone,
      shipping_line1: order.shipping_line1,
      shipping_city: order.shipping_city,
      shipping_postal_code: order.shipping_postal_code,
      shipping_country: order.shipping_country,
      customer_note: order.customer_note,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      created_at: order.created_at,
      customer: order.customer_id
        ? {
            id: Number(order.customer_id),
            name: order.customer_name,
            email: order.customer_email,
          }
        : null,
      items: itemsByOrder.get(Number(order.id)) ?? [],
    }));

    return NextResponse.json({ orders: payload }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json({ error: "Failed to load admin orders" }, { status: 500 });
  }
}
