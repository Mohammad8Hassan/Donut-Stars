import { db } from "@/lib/db";
import { TERMINAL_STATUS_GRACE_SECONDS } from "@/lib/orderStatus";
import { advanceOrders } from "@/lib/advanceOrders";

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

  await advanceOrders();

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

// Row shape from the orders table for a single tracked order (the guest
// flow looks a single order up by id + shipping phone, not by user_id).
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

// Row shape from order_items joined with products, scoped to one order
// (no order_id column needed here, unlike OrderItemListRow above which
// batches items across many orders at once).
type TrackedItemRow = {
  order_item_id: number | string;
  quantity: number | string;
  unit_price: number | string;
  product_name: string;
  capacity: number | string | null;
};

export type TrackedOrder = {
  id: number;
  status: string;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: Date | string;
  items: OrderItemSummary[];
};

// ---------------------------------------------------------------------------
// fetchTrackedOrder
// Guest order lookup by id + shipping phone (the phone acts as a shared
// secret in place of a session — see app/api/orders/track/route.ts). Shared
// by both that one-shot route and the SSE route at
// app/api/orders/track/stream/route.ts so the actual query only lives in
// one place, per the same "don't fork this logic" convention fetchOrderHistory
// above follows. Returns null when nothing matches; callers decide how to
// respond (404 for the one-shot route, a "not-found" SSE event for the
// stream route).
// ---------------------------------------------------------------------------
export async function fetchTrackedOrder(orderId: number, phone: string): Promise<TrackedOrder | null> {
  
  await advanceOrders();

  // Query 1: the order itself, gated on id + phone matching together so a
  // guessed order id alone isn't enough to see someone else's order.
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
    return null;
  }

  const order = orderRows[0] as TrackedOrderRow;

  // Query 2: this order's line items.
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

  const normalizedItems = (itemRows ?? []) as TrackedItemRow[];
  const orderItemIds = normalizedItems.map((item) => Number(item.order_item_id));

  const boxContentsByOrderItem = new Map<number, Array<{ name: string; quantity: number }>>();

  // Query 3: box contents, only if any of the line items are boxes.
  if (orderItemIds.length > 0) {
    const placeholders = makePlaceholders(orderItemIds.length);
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

    for (const row of (boxContentRows ?? []) as BoxContentListRow[]) {
      const orderItemId = Number(row.order_item_id);
      const existing = boxContentsByOrderItem.get(orderItemId) ?? [];
      existing.push({ name: row.donut_name, quantity: Number(row.quantity) });
      boxContentsByOrderItem.set(orderItemId, existing);
    }
  }

  return {
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
  };
}
