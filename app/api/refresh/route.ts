import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { getUserWithRoleById, sanitizeUser, signAccessToken } from "@/lib/auth";


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
    
    const foundUser = await getUserWithRoleById(decoded.userId);

    if (!foundUser) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(refreshToken, foundUser.refresh_token_hash);
    if (!isMatch) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const sessionUser = sanitizeUser(foundUser);
    const response = NextResponse.json({ user: sessionUser }, { status: 200 });

    const accessToken = signAccessToken(sessionUser);

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
}
