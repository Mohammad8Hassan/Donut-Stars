import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import {
  getUserWithRoleByEmail,
  sanitizeUser,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const foundUser = await getUserWithRoleByEmail(email);

    if (!foundUser) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!foundUser.password_hash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(password, foundUser.password_hash);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sessionUser = sanitizeUser(foundUser);
    const accessToken = signAccessToken(sessionUser);
    const refreshToken = signRefreshToken(sessionUser.id);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await db.query(
      "UPDATE users SET refresh_token_hash = ? WHERE id = ?",
      [hashedRefresh, sessionUser.id]
    );

    const response = NextResponse.json({ user: sessionUser });

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
    console.error("LOGIN ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  
}
