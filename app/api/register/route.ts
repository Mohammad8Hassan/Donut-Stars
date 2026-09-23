import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(`register:${getClientIp(req)}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many accounts created from this location. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    // Check if email already exists
    const [existing]: any = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result]: any = await db.query(
      `
      INSERT INTO users (role_id, name, email, password_hash, phone)
      VALUES (?, ?, ?, ?, ?)
      `,
      [1, name, email, passwordHash, phone ?? null]
    );

    const userId = result.insertId;

    const accessToken = signAccessToken({ id: userId, roleId: 1, roleName: "customer" });
    const refreshToken = signRefreshToken(userId);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await db.query(
      "UPDATE users SET refresh_token_hash = ? WHERE id = ?",
      [hashedRefresh, userId]
    );

    const response = NextResponse.json({ success: true });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;

  } catch (err) {
    console.error("REGISTER ERROR", err);
    console.error("REGISTER ERROR");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }


}
