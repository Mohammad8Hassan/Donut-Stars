import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { advanceOrders } from "@/lib/advanceOrders";

type OverviewRow = {
  total_orders: number | string | null;
  revenue: number | string | null;
  average_order_value: number | string | null;
  preparing_orders: number | string | null;
  out_for_delivery_orders: number | string | null;
  completed_orders: number | string | null;
  cancelled_orders: number | string | null;
};

type UserSummaryRow = {
  total_customers: number | string | null;
  total_admins: number | string | null;
};

type ProductSummaryRow = {
  active_products: number | string | null;
};

type RecentSummaryRow = {
  orders_last_7_days: number | string | null;
  revenue_last_7_days: number | string | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) {
    return guard.response;
  }

  try {
    await advanceOrders();

    const [overviewRows]: any = await db.query(
      `
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total), 0) AS revenue,
        COALESCE(AVG(total), 0) AS average_order_value,
        COALESCE(SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END), 0) AS preparing_orders,
        COALESCE(SUM(CASE WHEN status = 'out_for_delivery' THEN 1 ELSE 0 END), 0) AS out_for_delivery_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders
      FROM orders
      `
    );

    const [userRows]: any = await db.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN r.name = 'customer' THEN 1 ELSE 0 END), 0) AS total_customers,
        COALESCE(SUM(CASE WHEN r.name = 'admin' THEN 1 ELSE 0 END), 0) AS total_admins
      FROM users u
      INNER JOIN roles r
        ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
      `
    );

    const [productRows]: any = await db.query(
      `
      SELECT COUNT(*) AS active_products
      FROM products
      WHERE is_active = TRUE
      `
    );

    const [recentRows]: any = await db.query(
      `
      SELECT
        COUNT(*) AS orders_last_7_days,
        COALESCE(SUM(total), 0) AS revenue_last_7_days
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `
    );

    const overview = (overviewRows?.[0] ?? {}) as OverviewRow;
    const users = (userRows?.[0] ?? {}) as UserSummaryRow;
    const products = (productRows?.[0] ?? {}) as ProductSummaryRow;
    const recent = (recentRows?.[0] ?? {}) as RecentSummaryRow;

    return NextResponse.json(
      {
        stats: {
          totalOrders: toNumber(overview.total_orders),
          revenue: toNumber(overview.revenue),
          averageOrderValue: toNumber(overview.average_order_value),
          preparingOrders: toNumber(overview.preparing_orders),
          outForDeliveryOrders: toNumber(overview.out_for_delivery_orders),
          completedOrders: toNumber(overview.completed_orders),
          cancelledOrders: toNumber(overview.cancelled_orders),
          totalCustomers: toNumber(users.total_customers),
          totalAdmins: toNumber(users.total_admins),
          activeProducts: toNumber(products.active_products),
          ordersLast7Days: toNumber(recent.orders_last_7_days),
          revenueLast7Days: toNumber(recent.revenue_last_7_days),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
}
