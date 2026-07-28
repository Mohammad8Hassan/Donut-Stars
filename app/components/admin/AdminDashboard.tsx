"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  LayoutDashboard,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { authFetch } from "@/app/api/authFetch";
import { ORDER_STATUSES, getStatusLabel, getStatusBadgeClasses } from "@/lib/orderStatus";

// These types reflect the normalized admin API payloads, not raw database rows.
type AdminStats = {
  totalOrders: number;
  revenue: number;
  averageOrderValue: number;
  preparingOrders: number;
  outForDeliveryOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  totalAdmins: number;
  activeProducts: number;
  ordersLast7Days: number;
  revenueLast7Days: number;
};

type AdminOrderItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  capacity: number | null;
  boxContents: Array<{ name: string; quantity: number }>;
};

type AdminOrder = {
  id: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  payment_last4: string | null;
  shipping_name: string;
  shipping_phone: string | null;
  shipping_line1: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  customer_note: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  customer: { id: number; name: string | null; email: string | null } | null;
  items: AdminOrderItem[];
};

type DashboardResponse = {
  stats: AdminStats;
  orders: AdminOrder[];
};

const statusOptions = ORDER_STATUSES;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function loadDashboard(status: string): Promise<DashboardResponse> {
  // Stats and orders are fetched in parallel because the dashboard needs both
  // to paint the initial screen and neither depends on the other.
  const [statsRes, ordersRes] = await Promise.all([
    authFetch("/api/admin/stats", { cache: "no-store" }),
    authFetch(`/api/admin/orders?limit=12${status ? `&status=${status}` : ""}`, {
      cache: "no-store",
    }),
  ]);

  if (!statsRes.ok) {
    const data = await statsRes.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to load admin stats.");
  }

  if (!ordersRes.ok) {
    const data = await ordersRes.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to load admin orders.");
  }

  const statsData = await statsRes.json();
  const ordersData = await ordersRes.json();

  return {
    stats: statsData.stats,
    orders: ordersData.orders ?? [],
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        // The dashboard reloads when the filter changes or when we manually bump
        // reloadTick via the refresh button.
        setLoading(true);
        setError(null);
        const data = await loadDashboard(statusFilter);

        if (!active) return;

        setStats(data.stats);
        setOrders(data.orders);
        setStatusDrafts(
          Object.fromEntries(data.orders.map((order) => [order.id, order.status]))
        );
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Failed to load admin dashboard.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [statusFilter, reloadTick]);

  async function handleStatusUpdate(orderId: number) {
    const nextStatus = statusDrafts[orderId];
    if (!nextStatus) return;

    try {
      setUpdatingOrderId(orderId);
      setError(null);

      // Status updates are performed against the dedicated admin write endpoint.
      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update order status.");
      }

      // After a successful mutation we refresh both the queue and the stats so
      // counters like pending/completed stay in sync with the visible order card.
      const data = await loadDashboard(statusFilter);

      startTransition(() => {
        setStats(data.stats);
        setOrders(data.orders);
        setStatusDrafts(
          Object.fromEntries(data.orders.map((order) => [order.id, order.status]))
        );
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const statCards = stats
    ? [
        {
          label: "Revenue",
          value: formatCurrency(stats.revenue),
          detail: `${formatCurrency(stats.revenueLast7Days)} in the last 7 days`,
          icon: <BadgeDollarSign className="h-5 w-5" />,
          accent: "bg-rose-500",
        },
        {
          label: "Orders",
          value: String(stats.totalOrders),
          detail: `${stats.preparingOrders} preparing now`,
          icon: <ShoppingBag className="h-5 w-5" />,
          accent: "bg-zinc-950",
        },
        {
          label: "Customers",
          value: String(stats.totalCustomers),
          detail: `${stats.totalAdmins} admin account${stats.totalAdmins === 1 ? "" : "s"}`,
          icon: <Users className="h-5 w-5" />,
          accent: "bg-amber-500",
        },
        {
          label: "Average Order",
          value: formatCurrency(stats.averageOrderValue),
          detail: `${stats.activeProducts} active products`,
          icon: <LayoutDashboard className="h-5 w-5" />,
          accent: "bg-emerald-500",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.16),_transparent_24%),linear-gradient(135deg,_#fff7ed_0%,_#ffffff_46%,_#fff1f2_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_26px_60px_rgba(15,23,42,0.1)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-zinc-100 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.25)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-500">
                Donut Stars admin
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Live store overview and fulfillment queue
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Track revenue, monitor order flow, and update fulfillment status from one dashboard built around your current storefront data.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/menu"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
                >
                  View storefront
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  // This increments a tiny reload token rather than mutating the filter,
                  // which gives us an explicit refresh without changing dashboard state.
                  onClick={() => setReloadTick((current) => current + 1)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-800 transition hover:border-rose-200 hover:bg-rose-50"
                >
                  <RefreshCcw className={`h-4 w-4 ${loading || isPending ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid gap-px bg-zinc-100 sm:grid-cols-2 lg:grid-cols-1">
              <div className="bg-white p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Orders last 7 days</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
                  {stats ? stats.ordersLast7Days : "--"}
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Preparing</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
                  {stats ? stats.preparingOrders : "--"}
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Out for delivery</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
                  {stats ? stats.outForDeliveryOrders : "--"}
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Completed</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
                  {stats ? stats.completedOrders : "--"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-zinc-500">Loading admin dashboard...</p>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </section>
        ) : null}

        {!loading && !error && stats ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <article
                key={card.label}
                className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-zinc-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{card.detail}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${card.accent}`}>
                    {card.icon}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 border-b border-zinc-100 bg-gradient-to-r from-white via-rose-50 to-amber-50 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Order center</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
                  Manage recent orders
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  Review customer details, inspect box contents, and move orders through the fulfillment pipeline.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-800">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-12 min-w-[220px] rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 bg-zinc-50/50 p-4 sm:p-6">
              {orders.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                    <PackageCheck className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">No orders found</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    Try another filter or come back after the next customer checkout.
                  </p>
                </div>
              ) : null}

              {orders.map((order) => {
                // Address text is assembled client-side so the API can keep the original
                // address fields individually available for future admin features.
                const address = [
                  order.shipping_line1,
                  order.shipping_city,
                  order.shipping_postal_code,
                  order.shipping_country,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.06)]"
                  >
                    <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
                      <div className="border-b border-zinc-100 bg-gradient-to-br from-white to-rose-50 p-5 xl:border-b-0 xl:border-r">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">
                              Order #{order.id}
                            </p>
                            <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
                              {order.customer?.name || order.shipping_name}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-600">
                              {order.customer?.email || "Guest checkout"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Placed
                            </p>
                            <p className="mt-2 text-base font-semibold text-zinc-950">
                              {formatDateTime(order.created_at)}
                            </p>
                          </div>
                          <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Total
                            </p>
                            <p className="mt-2 text-base font-semibold text-zinc-950">
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-zinc-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Delivery</p>
                          <p className="mt-2 text-sm font-semibold text-zinc-950">{order.shipping_name}</p>
                          {order.shipping_phone ? (
                            <p className="mt-1 text-sm text-zinc-600">{order.shipping_phone}</p>
                          ) : null}
                          <p className="mt-2 text-sm leading-6 text-zinc-600">{address}</p>
                        </div>

                        {order.customer_note ? (
                          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Customer note</p>
                            <p className="mt-2 text-sm leading-6 text-amber-950">{order.customer_note}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Items</p>
                            <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
                              {order.items.length} line item{order.items.length === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                            <Truck className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="font-semibold text-zinc-950">
                                    {item.quantity}x {item.name}
                                  </p>
                                  {item.capacity !== null && item.boxContents.length > 0 ? (
                                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                                      Filled with{" "}
                                      {item.boxContents
                                        .map((donut) => `${donut.quantity}x ${donut.name}`)
                                        .join(", ")}
                                    </p>
                                  ) : null}
                                </div>
                                <p className="text-sm font-semibold text-zinc-700">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="grid gap-2 text-sm text-zinc-600">
                            <p>
                              Payment:{" "}
                              <span className="font-semibold text-zinc-950">
                                {order.payment_method
                                  ? order.payment_method.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                  : "Not set"}
                              </span>
                            </p>
                            <p>
                              Summary:{" "}
                              <span className="font-semibold text-zinc-950">
                                {formatCurrency(order.subtotal)} + {formatCurrency(order.shipping)} shipping
                              </span>
                            </p>
                            <p className="text-zinc-950">
                              Total collected: <span className="font-black">{formatCurrency(order.total)}</span>
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                              // Draft status changes locally so admins can choose a new state
                              // before committing it with the action button.
                              value={statusDrafts[order.id] ?? order.status}
                              onChange={(event) =>
                                setStatusDrafts((current) => ({
                                  ...current,
                                  [order.id]: event.target.value,
                                }))
                              }
                              className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {getStatusLabel(status)}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => void handleStatusUpdate(order.id)}
                              disabled={
                                updatingOrderId === order.id ||
                                isPending ||
                                (statusDrafts[order.id] ?? order.status) === order.status
                              }
                              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PackageCheck className="h-4 w-4" />
                              {updatingOrderId === order.id ? "Saving..." : "Update status"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
