import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { getRefreshTokenSecret } from "@/lib/auth";

export async function POST() {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        getRefreshTokenSecret()
      ) as { userId: number };

      // Invalidate refresh token in DB
      await db.query(
        "UPDATE users SET refresh_token_hash = NULL WHERE id = ?",
        [decoded.userId]
      );
    } catch {
      // Token invalid/expired — still clear cookies
    }
  }

  const res = NextResponse.json({ success: true });

  // Clear cookies
  res.cookies.set("accessToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  res.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return res;
}
