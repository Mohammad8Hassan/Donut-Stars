import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

function isAdminPage(pathname: string) {
  return pathname.startsWith("/admin");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("accessToken")?.value;

  if (!token) {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const secretValue = process.env.JWT_ACCESS_SECRET;
    if (!secretValue) {
      console.error("[middleware] JWT_ACCESS_SECRET env var is not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jwtVerify(token, secret);

    if (isAdminPage(pathname) || pathname.startsWith("/api/admin/")) {
      if (payload.roleName !== "admin") {
        if (isApiRoute(pathname)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
