import { db } from "@/lib/db";
import { TERMINAL_STATUS_GRACE_SECONDS } from "@/lib/orderStatus";

// Row shape from the orders table (used when listing a customer's past orders).
type OrderListRow = {
  id: number | string;
  status: string;
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
};

// Row shape from order_items joined with products.
type OrderItemListRow = {
  order_item_id: number | string;
  order_id: number | string;
  quantity: number | string;
  unit_price: number | string;
  product_name: string;
  capacity: number | string | null;
};

// Row shape from order_item_box_contents joined with products.
type BoxContentListRow = {
  order_item_id: number | string;
  quantity: number | string;
  donut_name: string;
};

export type OrderItemSummary = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  capacity: number | null;
  boxContents: Array<{ name: string; quantity: number }>;
};

export type OrderSummary = {
  id: number;
  status: string;
  payment_method: string | null;
  payment_last4: string | null;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  customer_note: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: Date | string;
  items: OrderItemSummary[];
};

// Builds a comma-separated string of "?" placeholders for SQL IN clauses.
function makePlaceholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

export async function fetchOrderHistory(userId: number, options?: { activeOnly?: boolean }): Promise<OrderSummary[]> {

  // "Active" still means "still in flight", but a just-finished order stays
  // in for a short grace window after completed_at/cancelled_at so the
  // client gets to render its terminal status at least once before it drops
  // off (see TERMINAL_STATUS_GRACE_SECONDS) instead of vanishing on the very
  // next poll.
  const statusFilter = options?.activeOnly
    ? `AND (
        status NOT IN ('completed', 'cancelled')
        OR (status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL ? SECOND))
        OR (status = 'cancelled' AND cancelled_at >= DATE_SUB(NOW(), INTERVAL ? SECOND))
      )`
    : "";

  const params = options?.activeOnly
    ? [userId, TERMINAL_STATUS_GRACE_SECONDS, TERMINAL_STATUS_GRACE_SECONDS]
    : [userId];

  // Query 1: this user's orders
  const [orders]: any = await db.query(
    `
    SELECT
      id,
      status,
      payment_method,
      payment_last4,
      shipping_name,
      shipping_phone,
      shipping_line1,
      shipping_city,
      shipping_postal_code,
      shipping_country,
      customer_note,
      subtotal,
      shipping,
      total,
      created_at
    FROM orders
    WHERE user_id = ? ${statusFilter}
    ORDER BY created_at DESC, id DESC
    `,
    params
  );

  const orderRows = (orders ?? []) as OrderListRow[];
  const orderIds = orderRows.map((order) => Number(order.id));

  // If there are no matching orders, skip the follow-up queries
  if (orderIds.length === 0) {
    return [];
  }

  // Query 2: fetch all line items for every order
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

  const normalizedItems = (itemRows ?? []) as OrderItemListRow[];
  const orderItemIds = normalizedItems.map((item) => Number(item.order_item_id));

  const boxContentsByOrderItem = new Map<number, Array<{ name: string; quantity: number }>>();

  // Query 3: fetch box contents only if there are any box line items.
  if (orderItemIds.length > 0) {
    const [boxContentRows]: any = await db.query(
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

    for (const row of (boxContentRows ?? []) as BoxContentListRow[]) {
      const orderItemId = Number(row.order_item_id);
      const existing = boxContentsByOrderItem.get(orderItemId) ?? [];
      existing.push({
        name: row.donut_name,
        quantity: Number(row.quantity),
      });
      boxContentsByOrderItem.set(orderItemId, existing);
    }
  }

  const itemsByOrder = new Map<number, OrderItemSummary[]>();

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

  return orderRows.map((order) => ({
    id: Number(order.id),
    status: order.status,
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
    items: itemsByOrder.get(Number(order.id)) ?? [],
  }));
}
