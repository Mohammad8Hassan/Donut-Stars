import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// These row shapes mirror the aggregate SQL aliases below. mysql2 can return
// numeric aggregates as strings, so we normalize with toNumber() before responding.
type DailyRow = {
  day: string;
  orders: number | string | null;
  revenue: number | string | null;
};

type BestSellerRow = {
  product_id: number | string;
  product_name: string;
  category_name: string | null;
  units_sold: number | string | null;
  revenue: number | string | null;
};

type CategoryRow = {
  category_id: number | string;
  category_name: string | null;
  units_sold: number | string | null;
  revenue: number | string | null;
};

type PeakHourRow = {
  hour: number | string;
  orders: number | string | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Reject non-numeric input instead of letting NaN flow into a SQL parameter.
function clampDays(raw: string | null) {
  const parsed = Number(raw ?? "30");
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), 365);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// Built from local Date methods (not toISOString/UTC) so the calendar days here
// line up with the server-local DATE_FORMAT() days MySQL groups rows into.
function lastNDates(days: number) {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return dates;
}

export async function GET(req: Request) {
  // Middleware also gates /api/admin/*, but every admin route re-checks for real security.
  const guard = await requireAdmin();
  if (guard.response) {
    return guard.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = clampDays(searchParams.get("days"));

    const [dailyRows, bestSellerRows, categoryRows, peakHourRows]: any[] = await Promise.all([
      db.query(
        `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
          COUNT(*) AS orders,
          COALESCE(SUM(total), 0) AS revenue
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY day
        ORDER BY day ASC
        `,
        [days]
      ),
      db.query(
        `
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          c.name AS category_name,
          SUM(oi.quantity) AS units_sold,
          SUM(oi.quantity * oi.unit_price) AS revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN categories c ON c.id = p.category_id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY p.id, p.name, c.name
        ORDER BY units_sold DESC
        LIMIT 10
        `,
        [days]
      ),
      db.query(
        `
        SELECT
          c.id AS category_id,
          c.name AS category_name,
          SUM(oi.quantity) AS units_sold,
          SUM(oi.quantity * oi.unit_price) AS revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN categories c ON c.id = p.category_id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
        `,
        [days]
      ),
      db.query(
        `
        SELECT
          HOUR(created_at) AS hour,
          COUNT(*) AS orders
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY hour
        ORDER BY hour ASC
        `,
        [days]
      ),
    ]);

    const dailyByDay = new Map<string, { orders: number; revenue: number }>();
    for (const row of (dailyRows[0] ?? []) as DailyRow[]) {
      dailyByDay.set(row.day, { orders: toNumber(row.orders), revenue: toNumber(row.revenue) });
    }
    // Zero-fill every calendar day in the window so gaps (no orders that day) still plot.
    const daily = lastNDates(days).map((date) => ({
      date,
      orders: dailyByDay.get(date)?.orders ?? 0,
      revenue: dailyByDay.get(date)?.revenue ?? 0,
    }));

    const bestSellers = ((bestSellerRows[0] ?? []) as BestSellerRow[]).map((row) => ({
      productId: Number(row.product_id),
      productName: row.product_name,
      categoryName: row.category_name,
      unitsSold: toNumber(row.units_sold),
      revenue: toNumber(row.revenue),
    }));

    const categoryBreakdown = ((categoryRows[0] ?? []) as CategoryRow[]).map((row) => ({
      categoryId: Number(row.category_id),
      categoryName: row.category_name,
      unitsSold: toNumber(row.units_sold),
      revenue: toNumber(row.revenue),
    }));

    const peakHoursByHour = new Map<number, number>();
    for (const row of (peakHourRows[0] ?? []) as PeakHourRow[]) {
      peakHoursByHour.set(Number(row.hour), toNumber(row.orders));
    }
    // Zero-fill every hour of the day so the chart always has a full 0-23 x-axis.
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orders: peakHoursByHour.get(hour) ?? 0,
    }));

    return NextResponse.json(
      { days, daily, bestSellers, categoryBreakdown, peakHours },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({ error: "Failed to load admin analytics" }, { status: 500 });
  }
}
