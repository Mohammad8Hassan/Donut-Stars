import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { getRefreshTokenSecret, getUserWithRoleById, sanitizeUser, signAccessToken } from "@/lib/auth";


export async function POST(req: Request) {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded: any = jwt.verify(refreshToken, getRefreshTokenSecret()) as {
      userId: number;
    };

    const foundUser = await getUserWithRoleById(decoded.userId);

    if (!foundUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!foundUser.refresh_token_hash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(refreshToken, foundUser.refresh_token_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = sanitizeUser(foundUser);
    const response = NextResponse.json({ user: sessionUser });

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
