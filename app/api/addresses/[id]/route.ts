import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// Root-cause fix helper:
// `is_default` might arrive as true/false, 1/0, or "1"/"0" depending on caller/serialization.
function normalizeIsDefault(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const addressId = Number(params.id);

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    const body = await req.json();
    const {
      label,
      full_name,
      phone,
      line1,
      city,
      postal_code,
      country,
      is_default,
    } = body;

    const nextIsDefault = normalizeIsDefault(is_default);

    if (!full_name || !phone || !line1 || !city || !country) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Update selected address first (ownership protected by user_id in WHERE).
    const [result]: any = await db.execute(
      `
      UPDATE addresses
      SET
        label = ?,
        full_name = ?,
        phone = ?,
        line1 = ?,
        city = ?,
        postal_code = ?,
        country = ?,
        is_default = ?
      WHERE id = ? AND user_id = ?
      `,
      [
        label ?? null,
        full_name,
        phone,
        line1,
        city,
        postal_code ?? null,
        country,
        nextIsDefault,
        addressId,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // If this address is now default, clear default on all siblings.
    if (nextIsDefault) {
      await db.execute(
        `
        UPDATE addresses
        SET is_default = FALSE
        WHERE user_id = ? AND id <> ?
        `,
        [userId, addressId]
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/addresses/:id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const addressId = Number(params.id);

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    const [result]: any = await db.execute(
      `
      DELETE FROM addresses
      WHERE id = ? AND user_id = ?
      `,
      [addressId, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/addresses/:id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
