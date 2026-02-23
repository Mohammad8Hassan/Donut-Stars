import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";


export async function middleware(req: NextRequest) {
  
  // from the HttpOnly cookie
  const token = req.cookies.get("accessToken")?.value;
  console.log("Request:", req);
  console.log("Token in middleware:", token);
  // No token at all → block or redirect
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }


  // Verify token
  try {
    const secret = new TextEncoder().encode("shhhhh");
    const { payload } = await jwtVerify(token, secret);
    console.log("yes valid ", payload);
    return NextResponse.next();
  } catch {
    console.log("Invalid token");
    // Token invalid → same handling as above
    return NextResponse.redirect(new URL("/login", req.url));
  }
}


export const config = {
  matcher: [
    // "/account/:path*",
  ],
};
