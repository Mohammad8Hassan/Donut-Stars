import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fetchOrderHistory } from "@/lib/orders";

type IncomingCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
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
  price: number;
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

function resolveGuestAddress(raw: unknown): AddressRow | null {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const full_name = toOptionalString(source.full_name, 100);
  const phone = toOptionalString(source.phone, 30);
  const line1 = toOptionalString(source.line1, 255);
  const city = toOptionalString(source.city, 100);
  const country = toOptionalString(source.country, 100);
  const postal_code = toOptionalString(source.postal_code, 20);

  if (!full_name || !phone || !line1 || !city || !country) {
    return null;
  }

  return { full_name, phone, line1, city, postal_code, country };
}


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

// ---------------------------------------------------------------------------
// resolveProductId
// Looks up a product by its numeric database id. The client-sent price/name
// are otherwise ignored, but the id itself always comes from DB-sourced menu
// data (see lib/menu.ts), so a plain id lookup is enough here.
// Throws if the id is missing/non-numeric or doesn't match a product — this
// aborts the order.
// ---------------------------------------------------------------------------
async function resolveProductId(item: IncomingCartItem): Promise<ProductRow> {
  if (isNumericId(item.id)) {
    const [rows]: any = await db.query(
      `
      SELECT p.id, p.price, p.capacity, LOWER(TRIM(c.name)) AS category_name
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [Number(item.id)]
    );

    if (rows?.length) return rows[0] as ProductRow;
  }

  // No numeric id, or it didn't match any product — the client sent bad data.
  throw new Error(`Product not found for item ${item.id} (${item.name})`);
}


async function resolveDonutProductIdsforBox(contents: IncomingCartItem["contents"]): Promise<Array<{ donutProductId: number; quantity: number }>> {
  const map = new Map<number, number>();

  for (const donut of contents ?? []) {
    const donutIdCandidate = toNumber(donut.id);

    if (donutIdCandidate === null) {
      continue;
    }

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
    map.set(resolvedId, (map.get(resolvedId) || 0) + 1);
  }

  return Array.from(map.entries()).map(([donutProductId, quantity]) => ({
    donutProductId,
    quantity,
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
    // Guest checkout is allowed: getSession() returning null just means
    // orders.user_id will be stored as NULL (the column is nullable for this reason).
    const session = await getSession();
    const userId = session ? Number(session.user.id) : null;

    const body = await req.json();
    const items = (body?.items ?? []) as IncomingCartItem[];

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

    // Logged-in customers pick a saved address by id; guests type one in at
    // checkout, so we validate/sanitize it directly instead of trusting a DB row.
    let shippingAddress: AddressRow;

    if (userId !== null && body?.addressId !== undefined && body?.addressId !== null) {
      const addressId = Number(body.addressId);

      if (!Number.isInteger(addressId) || addressId <= 0) {
        return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
      }

      // Verify the address belongs to this user before using it for shipping.
      // This prevents a customer from shipping to someone else's saved address.
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

      shippingAddress = addressRows[0] as AddressRow;
    } else {
      const guestAddress = resolveGuestAddress(body?.address);

      if (!guestAddress) {
        return NextResponse.json({ error: "Missing or invalid delivery address" }, { status: 400 });
      }

      shippingAddress = guestAddress;
    }

    // Validate every cart item against the database and build the resolvedItems
    // list. This also calculates the server-side subtotal.
    const resolvedItems: ResolvedOrderItem[] = [];
    let subtotal = 0;
    let totalItemQuantity = 0;
    let totalBoxQuantity = 0;

    for (const item of items) {
      const quantityRaw = toNumber(item.quantity);

      if (quantityRaw === null || quantityRaw <= 0) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }

      const quantity = quantityRaw;

      // Resolve the product from the database (3 fallback strategies).
      // The server-side price from the DB is used — the client-supplied price is ignored.
      const product = await resolveProductId(item);
      const unitPrice = Number(product.price);

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
        const donutRows = await resolveDonutProductIdsforBox(selectedDonuts);

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

      totalItemQuantity += quantity;
      if (isBox) totalBoxQuantity += quantity;
      subtotal += unitPrice * quantity;
    }

    // Round to 2 decimal places to avoid floating-point drift (e.g. 10.999999...).
    subtotal = Number(subtotal.toFixed(2));
    // Free shipping on orders over $20.
    const shipping = subtotal > 20 ? 0 : 2.5;
    const total = Number((subtotal + shipping).toFixed(2));

    // All orders start preparing immediately. Payment status tracks whether cash is owed.
    const effectivePaymentStatus = paymentMethod === "cash-on-delivery" ? "pending" : "paid";
    const orderStatus = "preparing";


    const preparingMins = 1; // 1 minute
    const deliveryMins = 8;
    const preparingSecs = Math.round(preparingMins * 60);
    const deliverySecs = Math.round(deliveryMins * 60);


    const conn = await db.getConnection();
    let orderId: number;

    try {
      await conn.beginTransaction();

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
          total,
          paid_at,
          ready_at,
          delivery_due_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ${effectivePaymentStatus === "paid" ? "NOW()" : "NULL"},
          DATE_ADD(NOW(), INTERVAL ${preparingSecs} SECOND),
          DATE_ADD(NOW(), INTERVAL ${deliverySecs} SECOND)
        )
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
