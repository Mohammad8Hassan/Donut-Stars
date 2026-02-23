import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import jwt from "jsonwebtoken";

type AccessTokenPayload = {
  userId: number;
  iat: number;
  exp: number;
};

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    // 1️⃣ No token → not authenticated
    if (!accessToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 2️⃣ Verify token
    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(accessToken, "shhhhh") as AccessTokenPayload;
    } catch {
      // expired / invalid token
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 3️⃣ Fetch user
    const [rows] = await db.query<RowDataPacket[]>(
      `
        SELECT id, name, email, phone
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [payload.userId]
    );

    if (!rows.length) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    // 4️⃣ Return safe user object
    return NextResponse.json(
      { user: rows[0] },
      { status: 200 }
    );

  } catch (err) {
    console.error("GET /api/me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
