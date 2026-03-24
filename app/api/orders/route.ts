import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

type IncomingCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: 3 | 6 | 12;
  boxID?: string;
  contents?: Array<{
    id: string;
    name?: string;
  }>;
};

type ProductRow = {
  id: number;
  capacity: number | null;
  category_name: string;
};

type ResolvedOrderItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  isBox: boolean;
  boxContents: Array<{ donutProductId: number; quantity: number }>;
};

type AddressRow = {
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string | null;
  country: string;
};

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

type OrderItemListRow = {
  order_item_id: number | string;
  order_id: number | string;
  quantity: number | string;
  unit_price: number | string;
  product_name: string;
  capacity: number | string | null;
};

type BoxContentListRow = {
  order_item_id: number | string;
  quantity: number | string;
  donut_name: string;
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalString(value: unknown, maxLength?: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function isNumericId(value: string): boolean {
  return /^\d+$/.test(value);
}

function makePlaceholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

async function resolveProductId(item: IncomingCartItem): Promise<ProductRow> {
  const fallbackName = String(item.name || "").trim();

  if (isNumericId(item.id)) {
    const id = Number(item.id);
    const [rows]: any = await db.execute(
      `
      SELECT p.id, p.capacity, LOWER(TRIM(c.name)) AS category_name
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows?.length) return rows[0] as ProductRow;
  }

  if (item.size === 3 || item.size === 6 || item.size === 12) {
    const [boxRows]: any = await db.execute(
      `
      SELECT p.id, p.capacity, LOWER(TRIM(c.name)) AS category_name
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE LOWER(TRIM(c.name)) = 'boxes' AND p.capacity = ?
      LIMIT 1
      `,
      [item.size]
    );

    if (boxRows?.length) return boxRows[0] as ProductRow;
  }

  if (fallbackName) {
    const [nameRows]: any = await db.execute(
      `
      SELECT p.id, p.capacity, LOWER(TRIM(c.name)) AS category_name
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE p.name = ?
      LIMIT 1
      `,
      [fallbackName]
    );

    if (nameRows?.length) return nameRows[0] as ProductRow;
  }

  throw new Error(`Product not found for item ${item.id} (${item.name})`);
}

async function resolveDonutProductIds(contents: IncomingCartItem["contents"]): Promise<Array<{ donutProductId: number; quantity: number }>> {
  const map = new Map<number, number>();

  for (const donut of contents ?? []) {
    const donutIdCandidate = toNumber(donut.id);

    if (donutIdCandidate === null) {
      continue;
    }

    const [donutRows]: any = await db.execute(
      `
      SELECT p.id
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE p.id = ? AND LOWER(TRIM(c.name)) IN ('donuts')
      LIMIT 1
      `,
      [donutIdCandidate]
    );

    if (!donutRows?.length) {
      throw new Error(`Donut product not found for id ${donut.id}`);
    }

    const resolvedId = Number(donutRows[0].id);
    map.set(resolvedId, (map.get(resolvedId) || 0) + 1);
  }

  return Array.from(map.entries()).map(([donutProductId, quantity]) => ({
    donutProductId,
    quantity,
  }));
}

async function fetchOrderHistory(userId: number) {
  const [orders]: any = await db.execute(
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
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    `,
    [userId]
  );

  const orderRows = (orders ?? []) as OrderListRow[];
  const orderIds = orderRows.map((order) => Number(order.id));

  if (orderIds.length === 0) {
    return [];
  }

  const [itemRows]: any = await db.execute(
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

  if (orderItemIds.length > 0) {
    const [boxContentRows]: any = await db.execute(
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

  const itemsByOrder = new Map<number, Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    capacity: number | null;
    boxContents: Array<{ name: string; quantity: number }>;
  }>>();

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

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const orders = await fetchOrderHistory(userId);

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let transactionStarted = false;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await req.json();
    const addressId = Number(body?.addressId);
    const items = (body?.items ?? []) as IncomingCartItem[];

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const paymentInput = body?.payment ?? {};
    const paymentMethod = toOptionalString(paymentInput.method, 50) || "card";
    const paymentProvider = toOptionalString(paymentInput.provider, 50);
    const paymentReference = toOptionalString(paymentInput.reference, 255);
    const paymentLast4 = toOptionalString(paymentInput.last4, 4);

    if (paymentLast4 !== null && !/^\d{4}$/.test(paymentLast4)) {
      return NextResponse.json({ error: "Invalid payment last4" }, { status: 400 });
    }

    const paymentMetadata =
      paymentInput &&
      typeof paymentInput.metadata === "object" &&
      paymentInput.metadata !== null &&
      !Array.isArray(paymentInput.metadata)
        ? paymentInput.metadata
        : null;

    const paymentMetaValue = paymentMetadata === null ? null : JSON.stringify(paymentMetadata);
    const customerNote = toOptionalString(paymentInput.customerNote ?? paymentInput.note);

    const [addressRows]: any = await db.execute(
      `
      SELECT full_name, phone, line1, city, postal_code, country
      FROM addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [addressId, userId]
    );

    if (!addressRows.length) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const shippingAddress = addressRows[0] as AddressRow;

    const resolvedItems: ResolvedOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const quantityRaw = toNumber(item.quantity);
      const unitPriceRaw = toNumber(item.price);

      if (quantityRaw === null || quantityRaw <= 0) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }

      if (unitPriceRaw === null || unitPriceRaw < 0) {
        return NextResponse.json({ error: "Invalid item price" }, { status: 400 });
      }

      const quantity = quantityRaw;
      const unitPrice = unitPriceRaw;

      const product = await resolveProductId(item);
      const isBox = product.capacity !== null;

      if (isBox) {
        const capacity = Number(product.capacity);
        const selectedDonuts = item.contents ?? [];

        if (!selectedDonuts.length) {
          return NextResponse.json({ error: `Box ${item.name} is missing selected donuts` }, { status: 400 });
        }

        if (selectedDonuts.length !== capacity) {
          return NextResponse.json(
            { error: `Box ${item.name} must have exactly ${capacity} donuts selected` },
            { status: 400 }
          );
        }

        const donutRows = await resolveDonutProductIds(selectedDonuts);

        resolvedItems.push({
          productId: Number(product.id),
          quantity,
          unitPrice,
          isBox: true,
          boxContents: donutRows.map((donutItem) => ({
            donutProductId: donutItem.donutProductId,
            quantity: donutItem.quantity * quantity,
          })),
        });
      } else {
        resolvedItems.push({
          productId: Number(product.id),
          quantity,
          unitPrice,
          isBox: false,
          boxContents: [],
        });
      }

      subtotal += unitPrice * quantity;
    }

    subtotal = Number(subtotal.toFixed(2));
    const shipping = subtotal > 20 ? 0 : 2.5;
    const total = Number((subtotal + shipping).toFixed(2));

    const effectivePaymentStatus = paymentMethod === "cash-on-delivery" ? "pending" : "paid";
    const orderStatus = effectivePaymentStatus === "paid" ? "paid" : "pending";

    await db.beginTransaction();
    transactionStarted = true;

    const [orderResult]: any = await db.execute(
      `
      INSERT INTO orders (
        user_id,
        status,
        payment_status,
        payment_method,
        payment_provider,
        payment_reference,
        payment_last4,
        payment_meta,
        shipping_name,
        shipping_phone,
        shipping_line1,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        customer_note,
        subtotal,
        shipping,
        total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        orderStatus,
        effectivePaymentStatus,
        paymentMethod,
        paymentProvider,
        paymentReference,
        paymentLast4,
        paymentMetaValue,
        shippingAddress.full_name,
        shippingAddress.phone,
        shippingAddress.line1,
        shippingAddress.city,
        shippingAddress.postal_code,
        shippingAddress.country,
        customerNote,
        subtotal,
        shipping,
        total,
      ]
    );

    const orderId = Number(orderResult.insertId);

    for (const item of resolvedItems) {
      const [orderItemResult]: any = await db.execute(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
        `,
        [orderId, item.productId, item.quantity, item.unitPrice]
      );

      const orderItemId = Number(orderItemResult.insertId);

      if (item.isBox && item.boxContents.length > 0) {
        for (const boxContent of item.boxContents) {
          await db.execute(
            `
            INSERT INTO order_item_box_contents (order_item_id, donut_product_id, quantity)
            VALUES (?, ?, ?)
            `,
            [orderItemId, boxContent.donutProductId, boxContent.quantity]
          );
        }
      }
    }

    await db.commit();
    transactionStarted = false;

    return NextResponse.json({ success: true, orderId, subtotal, shipping, total }, { status: 201 });
  } catch (err: any) {
    if (transactionStarted) {
      try {
        await db.rollback();
      } catch {
      }
    }

    if (err?.message?.startsWith("Product not found") || err?.message?.startsWith("Donut product not found")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
