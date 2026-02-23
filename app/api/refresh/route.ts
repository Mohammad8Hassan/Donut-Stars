import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { cookies } from "next/headers";


export async function POST(req: Request) {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  console.log("Refresh token:", refreshToken);

  if (!refreshToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const decoded: any = jwt.verify(refreshToken, "shhhhhawy") as {
      userId: number;
    };

    console.log("Decoded refresh token:", decoded);
    
    const [rows]: any = await db.query(
      "SELECT id, name, role_id, refresh_token_hash FROM users WHERE id = ?",
      [decoded.userId]
    );

    console.log("User rows:", rows);

    if (!rows.length) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const foundUser = rows[0];

    const isMatch = await bcrypt.compare(refreshToken, foundUser.refresh_token_hash);
    if (!isMatch) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const response = NextResponse.json({ user: foundUser }, { status: 200 });

    
    const accessToken = jwt.sign({
      userId: foundUser.id,
      roleId: foundUser.role_id,
    }, "shhhhh", {
      expiresIn: "15m",
    });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 15,
    });

    return response;
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
}
