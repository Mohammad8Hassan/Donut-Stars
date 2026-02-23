// app/api/users/update/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    // 1️⃣ Authenticate (server authority)
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2️⃣ Get allowed fields from body
    const { name, email, phone } = await req.json();

    // (optional but recommended)
    if (!name || !email) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // 3️⃣ Update ONLY the logged-in user
    const userId = session.user.id;

    await db.execute(
      `
      UPDATE users
      SET name = ?, email = ?, phone = ?
      WHERE id = ?
      `,
      [name, email, phone ?? null, userId]
    );

    // 4️⃣ Re-fetch authoritative user
    const [rows]: any = await db.execute(
      `
      SELECT id, name, email, phone
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 5️⃣ Return updated user
    return NextResponse.json(
      { user: rows[0] },
      { status: 200 }
    );

  } catch (err) {
    console.error("POST /api/users/update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
