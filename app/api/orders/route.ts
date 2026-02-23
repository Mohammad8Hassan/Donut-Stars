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
};

type ResolvedOrderItem = {
  productId: number | null;
  boxTypeId: number | null;
  quantity: number;
  unitPrice: number;
};

// Box items are modeled in cart as ids like b1/b2/b3 or with a boxID.
function isBoxItem(item: IncomingCartItem): boolean {
  return item.id.startsWith("b") || !!item.boxID;
}

// Map known box ids to capacity when size is missing.
function resolveBoxCapacity(item: IncomingCartItem): 3 | 6 | 12 | null {
  if (item.size === 3 || item.size === 6 || item.size === 12) return item.size;
  if (item.id === "b1") return 3;
  if (item.id === "b2") return 6;
  if (item.id === "b3") return 12;
  return null;
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

    // Ensure the selected address belongs to the logged-in user.
    const [addressRows]: any = await db.execute(
      `
      SELECT id
      FROM addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [addressId, userId]
    );

    if (!addressRows.length) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const resolvedItems: ResolvedOrderItem[] = [];
    let subtotal = 0;

    // Resolve each cart item to either a product_id or box_type_id.
    for (const item of items) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.price);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: "Invalid item price" }, { status: 400 });
      }

      subtotal += unitPrice * quantity;

      if (isBoxItem(item)) {
        const capacity = resolveBoxCapacity(item);
        if (!capacity) {
          return NextResponse.json({ error: `Unknown box item: ${item.id}` }, { status: 400 });
        }

        const [boxRows]: any = await db.execute(
          `
          SELECT id
          FROM box_types
          WHERE capacity = ?
          LIMIT 1
          `,
          [capacity]
        );

        if (!boxRows.length) {
          return NextResponse.json({ error: `Box type not found for capacity ${capacity}` }, { status: 400 });
        }

        resolvedItems.push({
          productId: null,
          boxTypeId: Number(boxRows[0].id),
          quantity,
          unitPrice,
        });
      } else {
        // Resolve product by numeric id when available, otherwise by product name.
        const maybeNumericId = /^\d+$/.test(item.id) ? Number(item.id) : null;
        const [productRows]: any = maybeNumericId
          ? await db.execute(
              `
              SELECT id
              FROM products
              WHERE id = ? OR name = ?
              LIMIT 1
              `,
              [maybeNumericId, item.name]
            )
          : await db.execute(
              `
              SELECT id
              FROM products
              WHERE name = ?
              LIMIT 1
              `,
              [item.name]
            );

        if (!productRows.length) {
          return NextResponse.json({ error: `Product not found for item ${item.name}` }, { status: 400 });
        }

        resolvedItems.push({
          productId: Number(productRows[0].id),
          boxTypeId: null,
          quantity,
          unitPrice,
        });
      }
    }

    subtotal = Number(subtotal.toFixed(2));
    const shipping = subtotal > 20 ? 0 : 2.5;
    const total = Number((subtotal + shipping).toFixed(2));

    await db.beginTransaction();
    transactionStarted = true;

    const [orderResult]: any = await db.execute(
      `
      INSERT INTO orders (user_id, status, subtotal, shipping, total)
      VALUES (?, 'paid', ?, ?, ?)
      `,
      [userId, subtotal, shipping, total]
    );

    const orderId = Number(orderResult.insertId);

    for (const item of resolvedItems) {
      await db.execute(
        `
        INSERT INTO order_items (order_id, product_id, box_type_id, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
        `,
        [orderId, item.productId, item.boxTypeId, item.quantity, item.unitPrice]
      );
    }

    await db.commit();
    transactionStarted = false;

    return NextResponse.json({ success: true, orderId, subtotal, shipping, total }, { status: 201 });
  } catch (err) {
    if (transactionStarted) {
      try {
        await db.rollback();
      } catch {
        // Ignore rollback failure, return original error below.
      }
    }

    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
