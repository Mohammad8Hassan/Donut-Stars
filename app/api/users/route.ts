import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) {
    return guard.response;
  }

  const [rows] = await db.query(
    "SELECT id, name, email, phone, role_id, created_at FROM users WHERE deleted_at IS NULL"
  );
  return NextResponse.json(rows);
}
