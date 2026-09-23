import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

function normalizeIsDefault(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [rows] = await db.execute(
      `
      SELECT
        id,
        label,
        full_name,
        phone,
        line1,
        city,
        postal_code,
        country,
        CAST(is_default AS UNSIGNED) AS is_default,
        created_at
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
      `,
      [userId]
    );

    return NextResponse.json({ addresses: rows }, { status: 200 });
  } catch (err) {
    console.error("GET /api/addresses error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const {
      label,
      full_name,
      phone,
      line1,
      city,
      postal_code,
      country,
      is_default,
    } = await req.json();

    const nextIsDefault = normalizeIsDefault(is_default);

    if (!full_name || !phone || !line1 || !city || !country) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Enforce a single default address per user.
    if (nextIsDefault) {
      await db.execute(
        `
        UPDATE addresses
        SET is_default = FALSE
        WHERE user_id = ?
        `,
        [userId]
      );
    }

    await db.execute(
      `
      INSERT INTO addresses
        (user_id, label, full_name, phone, line1, city, postal_code, country, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        label ?? null,
        full_name,
        phone,
        line1,
        city,
        postal_code ?? null,
        country,
        nextIsDefault,
      ]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/addresses error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
