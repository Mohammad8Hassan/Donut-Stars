import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) {
    return guard.response;
  }

  const [rows] = await db.query("SELECT * FROM users");
  return NextResponse.json(rows);
}
