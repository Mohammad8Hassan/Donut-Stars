// app/api/users/update/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, email, phone } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    await db.execute(
      `
      UPDATE users
      SET name = ?, email = ?, phone = ?
      WHERE id = ?
      `,
      [name, email, phone ?? null, userId]
    );

    const [rows]: any = await db.execute(
      `
      SELECT u.id AS uid, u.name, u.email, u.phone, r.id AS roleId, r.name AS roleName
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
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
