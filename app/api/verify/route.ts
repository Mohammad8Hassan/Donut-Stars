import { NextResponse } from "next/server";

export async function GET() {
  // Placeholder: verify token or code in a real implementation
  return NextResponse.json({ ok: true, route: "verify", verified: false }, { status: 200 });
}
