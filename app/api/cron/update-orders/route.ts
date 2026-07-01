import { NextResponse } from "next/server";
import { advanceOrders } from "@/lib/advanceOrders";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (!CRON_SECRET) {
    console.error("[cron] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await advanceOrders();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    console.error("GET /api/cron/update-orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
