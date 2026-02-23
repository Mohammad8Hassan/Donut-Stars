import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT *
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const foundUser = rows[0];

    const match = await bcrypt.compare(password, foundUser.password_hash);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const accessToken = jwt.sign(
      { userId: foundUser.id, },
      "shhhhh",
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: foundUser.id },
      "shhhhhawy",
      { expiresIn: "7d" }
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await db.query(
      "UPDATE users SET refresh_token_hash = ? WHERE id = ?",
      [hashedRefresh, foundUser.id]
    );

    const response = NextResponse.json({ user: { id: foundUser.id, email: foundUser.email, name: foundUser.name } });

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
