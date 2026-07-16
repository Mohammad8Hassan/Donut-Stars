import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Row shape from the orders table for a single tracked order.
type TrackedOrderRow = {
  id: number | string;
  status: string;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  subtotal: number | string;
  shipping: number | string;
  total: number | string;
  created_at: Date | string;
};

// Row shape from order_items joined with products.
type OrderItemRow = {
  order_item_id: number | string;
  quantity: number | string;
  unit_price: number | string;
  product_name: string;
  capacity: number | string | null;
};

// Row shape from order_item_box_contents joined with products.
type BoxContentRow = {
  order_item_id: number | string;
  quantity: number | string;
  donut_name: string;
};

// ---------------------------------------------------------------------------
// GET /api/orders/track?orderId=123&phone=555-1234
//
// Public, unauthenticated lookup so guests (who have no account/session) can
// check the status of an order they placed. Requires the exact shipping
// phone number as a shared secret so guessing an order id alone isn't enough
// to see someone else's name/address.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = Number(searchParams.get("orderId"));
    const phone = (searchParams.get("phone") ?? "").trim();

    if (!Number.isInteger(orderId) || orderId <= 0 || !phone) {
      return NextResponse.json({ error: "Order number and phone are required" }, { status: 400 });
    }

    const [orderRows]: any = await db.query(
      `
      SELECT
        id,
        status,
        shipping_name,
        shipping_phone,
        shipping_line1,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        subtotal,
        shipping,
        total,
        created_at
      FROM orders
      WHERE id = ? AND shipping_phone = ?
      LIMIT 1
      `,
      [orderId, phone]
    );

    if (!orderRows.length) {
      return NextResponse.json({ error: "No order found for that order number and phone" }, { status: 404 });
    }

    const order = orderRows[0] as TrackedOrderRow;

    const [itemRows]: any = await db.query(
      `
      SELECT
        oi.id AS order_item_id,
        oi.quantity,
        oi.unit_price,
        p.name AS product_name,
        p.capacity
      FROM order_items oi
      INNER JOIN products p
        ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [orderId]
    );

    const normalizedItems = (itemRows ?? []) as OrderItemRow[];
    const orderItemIds = normalizedItems.map((item) => Number(item.order_item_id));

    const boxContentsByOrderItem = new Map<number, Array<{ name: string; quantity: number }>>();

    if (orderItemIds.length > 0) {
      const placeholders = orderItemIds.map(() => "?").join(", ");
      const [boxContentRows]: any = await db.query(
        `
        SELECT
          oibc.order_item_id,
          oibc.quantity,
          p.name AS donut_name
        FROM order_item_box_contents oibc
        INNER JOIN products p
          ON p.id = oibc.donut_product_id
        WHERE oibc.order_item_id IN (${placeholders})
        ORDER BY oibc.order_item_id ASC, p.name ASC
        `,
        orderItemIds
      );

      for (const row of (boxContentRows ?? []) as BoxContentRow[]) {
        const orderItemId = Number(row.order_item_id);
        const existing = boxContentsByOrderItem.get(orderItemId) ?? [];
        existing.push({ name: row.donut_name, quantity: Number(row.quantity) });
        boxContentsByOrderItem.set(orderItemId, existing);
      }
    }

    return NextResponse.json(
      {
        order: {
          id: Number(order.id),
          status: order.status,
          shipping_name: order.shipping_name,
          shipping_phone: order.shipping_phone,
          shipping_line1: order.shipping_line1,
          shipping_city: order.shipping_city,
          shipping_postal_code: order.shipping_postal_code,
          shipping_country: order.shipping_country,
          subtotal: Number(order.subtotal),
          shipping: Number(order.shipping),
          total: Number(order.total),
          created_at: order.created_at,
          items: normalizedItems.map((item) => ({
            id: Number(item.order_item_id),
            name: item.product_name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            capacity: item.capacity === null ? null : Number(item.capacity),
            boxContents: boxContentsByOrderItem.get(Number(item.order_item_id)) ?? [],
          })),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/orders/track error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
