import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { user, pwd } = await req.json();

  const [rows] = await db.query<any[]>("SELECT * FROM users WHERE username = ?", [user]);
  const foundUser = rows[0];
  if (!foundUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const match = await bcrypt.compare(pwd, foundUser.password);
  if (!match) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const accessToken = jwt.sign({ UserInfo: { username: foundUser.username } }, "shhhh", {
    expiresIn: "60s",
  });

  const refreshToken = jwt.sign({ UserInfo: { username: foundUser.username } }, "shhhhawy", {
    expiresIn: "7d",
  });

  const hashedToken = await bcrypt.hash(refreshToken, 10);
  
  await db.query("UPDATE users SET token = ? WHERE username = ?", [hashedToken, user]);

  const response = NextResponse.json({ success: true });

  console.log("accessTokenss: ", accessToken);

  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 15,
  });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60,
  });

  return response;
}
