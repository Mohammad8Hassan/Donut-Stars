import { NextResponse } from "next/server";
import { db } from "@/lib/db";
// db is a mysql2 connection pool. A pool manages a set of reusable database
// connections so the app doesn't have to open a new connection for every request.
// You call db.query() to run a SELECT/INSERT/etc. on whichever connection is free.
// For transactions you must call db.getConnection() to pin all your queries to
// one specific connection (explained further down near the transaction block).
import { getSession } from "@/lib/session";

// ---------------------------------------------------------------------------
// Types
// These describe the shape of data coming in from the client (IncomingCartItem)
// and the shape of rows coming back from the database (the *Row types).
// mysql2 returns plain JS objects, so typing them helps TypeScript catch mistakes.
// ---------------------------------------------------------------------------

// One item the browser sends inside the cart when placing an order.
type IncomingCartItem = {
  id: string;         // product id from the database (may be a numeric string)
  name: string;       // display name, used as a fallback if id lookup fails
  price: number;      // unit price the client claims — we trust this for now
  quantity: number;
  size?: 3 | 6 | 12; // only set for box products (3/6/12 donut boxes)
  boxID?: string;
  contents?: Array<{  // donuts the customer chose to fill a box with
    id: string;
    name?: string;
  }>;
};

// What we get back from the products table when we look up a product by id/name/size.
type ProductRow = {
  id: number;
  capacity: number | null; // null means it's a regular donut, a number means it's a box
  category_name: string;   // "donuts" or "boxes" etc.
};

// A fully validated cart item ready to be written to the database.
type ResolvedOrderItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  isBox: boolean;
  boxContents: Array<{ donutProductId: number; quantity: number }>;
};

// Row shape from the addresses table.
type AddressRow = {
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string | null;
  country: string;
};

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

// ---------------------------------------------------------------------------
// Small utility helpers
// ---------------------------------------------------------------------------

// Safely converts any value to a number, returning null if it's NaN or Infinity.
// Used to validate untrusted numbers from the request body.
function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Safely trims a string and returns null if it's empty or not a string at all.
// maxLength truncates to avoid accidentally storing huge strings from bad clients.
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

// Returns true if a string contains only digits — used to check whether an
// item id from the client looks like a real database id vs. a slug/name.
function isNumericId(value: string): boolean {
  return /^\d+$/.test(value);
}

// Builds a comma-separated string of "?" placeholders for SQL IN clauses.
// e.g. makePlaceholders(3) → "?, ?, ?"
// This is how mysql2 handles dynamic-length IN lists safely without SQL injection.
function makePlaceholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

// ---------------------------------------------------------------------------
// resolveProductId
// Looks up a product in the database using three fallback strategies:
//   1. Numeric id (most specific — client sent a real db id)
//   2. Box capacity (for items where only the size like "6-pack" is known)
//   3. Product name string (last resort fallback)
// Throws if nothing matches — this aborts the order.
// ---------------------------------------------------------------------------
async function resolveProductId(item: IncomingCartItem): Promise<ProductRow> {
  const fallbackName = String(item.name || "").trim();

  // Strategy 1: look up directly by numeric id.
  // db.query(sql, [values]) sends the SQL to MySQL with the ? placeholders replaced
  // by the values array. mysql2 escapes the values on the client side, which
  // prevents SQL injection. The result is [rows, fields] — we only need rows.
  if (isNumericId(item.id)) {
    const id = Number(item.id);
    const [rows]: any = await db.query(
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

  // Strategy 2: for box products the client sends a size (3/6/12).
  // We find the matching box product by its capacity column.
  if (item.size === 3 || item.size === 6 || item.size === 12) {
    const [boxRows]: any = await db.query(
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

  // Strategy 3: match by product name as a last resort.
  if (fallbackName) {
    const [nameRows]: any = await db.query(
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

  // All three strategies failed — the product doesn't exist or the client sent bad data.
  throw new Error(`Product not found for item ${item.id} (${item.name})`);
}

// ---------------------------------------------------------------------------
// resolveDonutProductIds
// For a box order the customer picks individual donuts to fill it.
// This function validates each chosen donut actually exists in the "donuts"
// category, then aggregates duplicates so we store one row per unique donut
// with the combined quantity rather than one row per slot.
// ---------------------------------------------------------------------------
async function resolveDonutProductIds(contents: IncomingCartItem["contents"]): Promise<Array<{ donutProductId: number; quantity: number }>> {
  // Map<donutProductId, count> — deduplicates repeated donut choices.
  const map = new Map<number, number>();

  for (const donut of contents ?? []) {
    const donutIdCandidate = toNumber(donut.id);

    // Skip any donut slot whose id isn't a valid number (shouldn't happen with
    // a well-behaved client but we guard anyway).
    if (donutIdCandidate === null) {
      continue;
    }

    // Confirm the donut is a real product in the "donuts" category.
    // This prevents a customer from putting a box product inside another box.
    const [donutRows]: any = await db.query(
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
    // Increment the count for this donut id (customer may pick the same donut twice).
    map.set(resolvedId, (map.get(resolvedId) || 0) + 1);
  }

  return Array.from(map.entries()).map(([donutProductId, quantity]) => ({
    donutProductId,
    quantity,
  }));
}

// ---------------------------------------------------------------------------
// fetchOrderHistory
// Loads all past orders for a user, with their line items and box contents,
// in three queries instead of N+1 queries:
//   1. Fetch all orders for the user
//   2. Fetch all order_items for those orders in one batch
//   3. Fetch all box contents for those items in one batch
// Then stitch everything together in JS before returning.
// ---------------------------------------------------------------------------
async function fetchOrderHistory(userId: number) {
  // Query 1: all orders belonging to this user, newest first.
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
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    `,
    [userId]
  );

  const orderRows = (orders ?? []) as OrderListRow[];
  const orderIds = orderRows.map((order) => Number(order.id));

  // If the user has no orders, skip the follow-up queries entirely.
  if (orderIds.length === 0) {
    return [];
  }

  // Query 2: fetch all line items for every order we just loaded.
  // We use an IN clause with placeholders so mysql2 can escape all ids safely.
  // makePlaceholders(n) produces "?, ?, ..." with the right number of slots.
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
    orderIds  // mysql2 spreads this array into the ? slots automatically
  );

  const normalizedItems = (itemRows ?? []) as OrderItemListRow[];
  const orderItemIds = normalizedItems.map((item) => Number(item.order_item_id));

  // Map<order_item_id, donut[]> — built in the next query, used when assembling
  // the final response so each line item includes its box donut breakdown.
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

    // Group box content rows by their order_item_id for O(1) lookup below.
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

  // Group line items by their order_id for O(1) lookup when building the response.
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
      // mysql2 can return numeric columns as strings depending on the driver version,
      // so we always coerce with Number() to be safe.
      capacity: item.capacity === null ? null : Number(item.capacity),
      boxContents: boxContentsByOrderItem.get(Number(item.order_item_id)) ?? [],
    });
    itemsByOrder.set(orderId, existing);
  }

  // Build the final response: each order with its nested items attached.
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

// ---------------------------------------------------------------------------
// GET /api/orders
// Returns the logged-in customer's full order history.
// ---------------------------------------------------------------------------
export async function GET() {
  try {

    // getSession() reads the accessToken cookie and verifies it.
    // Returns null if the user is not logged in or the token is expired.
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

// ---------------------------------------------------------------------------
// POST /api/orders
// Creates a new order from the customer's cart.
//
// Expected request body:
// {
//   addressId: number,          — which saved address to ship to
//   items: IncomingCartItem[],  — the cart contents
//   payment: {
//     method: string,           — "card", "cash-on-delivery", etc.
//     provider?: string,
//     reference?: string,
//     last4?: string,           — last 4 digits of card, if applicable
//     metadata?: object,
//     customerNote?: string,
//   }
// }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await req.json();
    const addressId = Number(body?.addressId);
    const items = (body?.items ?? []) as IncomingCartItem[];

    // Basic validation before touching the database.
    if (!Number.isInteger(addressId) || addressId <= 0) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Extract and sanitize payment fields from the request body.
    const paymentInput = body?.payment ?? {};
    const paymentMethod = toOptionalString(paymentInput.method, 50) || "card";
    const paymentProvider = toOptionalString(paymentInput.provider, 50);
    const paymentReference = toOptionalString(paymentInput.reference, 255);
    const paymentLast4 = toOptionalString(paymentInput.last4, 4);

    if (paymentLast4 !== null && !/^\d{4}$/.test(paymentLast4)) {
      return NextResponse.json({ error: "Invalid payment last4" }, { status: 400 });
    }

    // Only store metadata if it's actually a plain object (not an array or null).
    const paymentMetadata =
      paymentInput &&
      typeof paymentInput.metadata === "object" &&
      paymentInput.metadata !== null &&
      !Array.isArray(paymentInput.metadata)
        ? paymentInput.metadata
        : null;

    // Store metadata as a JSON string in the database (the column is TEXT/VARCHAR).
    const paymentMetaValue = paymentMetadata === null ? null : JSON.stringify(paymentMetadata);
    const customerNote = toOptionalString(paymentInput.customerNote ?? paymentInput.note);

    // Verify the address belongs to this user before using it for shipping.
    // This prevents a customer from shipping to someone else's saved address.
    // db.query() borrows any free connection from the pool, runs the query,
    // then immediately returns that connection for other requests to use.
    const [addressRows]: any = await db.query(
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

    // Validate every cart item against the database and build the resolvedItems
    // list. This also calculates the server-side subtotal.
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

      // Resolve the product from the database (3 fallback strategies).
      const product = await resolveProductId(item);

      // A product with a capacity is a box; without capacity it's a single donut.
      const isBox = product.capacity !== null;

      if (isBox) {
        const capacity = Number(product.capacity);
        const selectedDonuts = item.contents ?? [];

        // The box must be fully filled — no empty slots allowed.
        if (!selectedDonuts.length) {
          return NextResponse.json({ error: `Box ${item.name} is missing selected donuts` }, { status: 400 });
        }

        if (selectedDonuts.length !== capacity) {
          return NextResponse.json(
            { error: `Box ${item.name} must have exactly ${capacity} donuts selected` },
            { status: 400 }
          );
        }

        // Validate each chosen donut and deduplicate repeated choices.
        const donutRows = await resolveDonutProductIds(selectedDonuts);

        resolvedItems.push({
          productId: Number(product.id),
          quantity,
          unitPrice,
          isBox: true,
          // Multiply each donut's count by the box quantity so "2 boxes of 3"
          // correctly stores 6 donuts rather than 3.
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

    // Round to 2 decimal places to avoid floating-point drift (e.g. 10.999999...).
    subtotal = Number(subtotal.toFixed(2));
    // Free shipping on orders over $20.
    const shipping = subtotal > 20 ? 0 : 2.5;
    const total = Number((subtotal + shipping).toFixed(2));

    // Determine initial order/payment status from the payment method.
    // Card payments are immediately "paid"; cash-on-delivery stays "pending".
    const effectivePaymentStatus = paymentMethod === "cash-on-delivery" ? "pending" : "paid";
    const orderStatus = effectivePaymentStatus === "paid" ? "paid" : "pending";

    // -----------------------------------------------------------------------
    // Database transaction
    //
    // A transaction groups multiple INSERT statements so they either ALL
    // succeed or ALL get rolled back. This is critical here: if inserting the
    // order_items fails halfway through, we don't want a partial order in the
    // database with some items missing.
    //
    // WHY we use db.getConnection() instead of db.query() for this:
    //   db is a pool — it can have up to N connections open at once.
    //   db.query() grabs any free connection, runs one query, then gives it back.
    //   But a transaction (BEGIN → INSERT → INSERT → COMMIT) must run on the
    //   SAME connection the whole time, otherwise MySQL would see the BEGIN on
    //   connection A and the INSERTs on connection B, and B would have no idea
    //   a transaction was started.
    //   db.getConnection() "checks out" one specific connection from the pool
    //   and holds it until we call conn.release(), letting us use it exclusively
    //   for the entire transaction.
    // -----------------------------------------------------------------------
    const conn = await db.getConnection();
    // orderId is declared here so it's accessible after the try/finally block
    // when we build the success response.
    let orderId: number;

    try {
      // Tell MySQL to start a transaction on this connection.
      // From this point, nothing is permanently saved until we call commit().
      await conn.beginTransaction();

      // Insert the parent order row. conn.query() works exactly like db.query()
      // but runs on our pinned connection instead of a random pool connection.
      const [orderResult]: any = await conn.query(
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

      // insertId is MySQL's auto-increment id for the row we just inserted.
      orderId = Number(orderResult.insertId);

      // Insert one order_items row per line item, then insert box contents
      // for any items that are boxes.
      for (const item of resolvedItems) {
        const [orderItemResult]: any = await conn.query(
          `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price)
          VALUES (?, ?, ?, ?)
          `,
          [orderId, item.productId, item.quantity, item.unitPrice]
        );

        // Capture the auto-increment id of the order_item row we just inserted
        // so we can attach box contents to it.
        const orderItemId = Number(orderItemResult.insertId);

        // For boxes, insert one row per unique donut type into order_item_box_contents.
        if (item.isBox && item.boxContents.length > 0) {
          for (const boxContent of item.boxContents) {
            await conn.query(
              `
              INSERT INTO order_item_box_contents (order_item_id, donut_product_id, quantity)
              VALUES (?, ?, ?)
              `,
              [orderItemId, boxContent.donutProductId, boxContent.quantity]
            );
          }
        }
      }

      // All inserts succeeded — permanently save everything to the database.
      await conn.commit();
    } catch (err) {
      // Something went wrong — undo every INSERT from this transaction.
      // The database goes back to exactly the state it was in before beginTransaction().
      await conn.rollback();
      // Re-throw so the outer catch can decide which HTTP error to return.
      throw err;
    } finally {
      // Always return the connection to the pool, whether we committed or rolled back.
      // Without this, the pool would eventually run out of available connections.
      conn.release();
    }

    return NextResponse.json({ success: true, orderId, subtotal, shipping, total }, { status: 201 });
  } catch (err: any) {
    // Product/donut lookup errors are the customer's fault (bad cart data) — return 400.
    if (err?.message?.startsWith("Product not found") || err?.message?.startsWith("Donut product not found")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Any other error (DB failure, unexpected crash) is our fault — return 500.
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
