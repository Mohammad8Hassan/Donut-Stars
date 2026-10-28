"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCcw,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { authFetch } from "@/app/api/authFetch";

type DailyPoint = { date: string; orders: number; revenue: number };
type BestSeller = {
  productId: number;
  productName: string;
  categoryName: string | null;
  unitsSold: number;
  revenue: number;
};
type CategoryBreakdown = {
  categoryId: number;
  categoryName: string | null;
  unitsSold: number;
  revenue: number;
};
type PeakHour = { hour: number; orders: number };

type AnalyticsResponse = {
  days: number;
  daily: DailyPoint[];
  bestSellers: BestSeller[];
  categoryBreakdown: CategoryBreakdown[];
  peakHours: PeakHour[];
};

const rangeOptions = [7, 30, 90];

const categoryColors: Record<string, string> = {
  Donuts: "hsl(var(--chart-1))",
  Drinks: "hsl(var(--chart-2))",
  Boxes: "hsl(var(--chart-4))",
};
const fallbackCategoryColor = "hsl(var(--chart-5))";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

async function loadAnalytics(days: number): Promise<AnalyticsResponse> {
  const res = await authFetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to load admin analytics.");
  }

  return res.json();
}

const dailyOrdersConfig = {
  orders: { label: "Orders", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const dailyRevenueConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const bestSellersConfig = {
  unitsSold: { label: "Units sold", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const categoryConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const peakHoursConfig = {
  orders: { label: "Orders", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [days, setDays] = useState(30);
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        setLoading(true);
        setError(null);
        const next = await loadAnalytics(days);

        if (!active) return;
        setData(next);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Failed to load admin analytics.");
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
  }, [days, reloadTick]);

  const totalUnitsInWindow = data?.categoryBreakdown.reduce((sum, row) => sum + row.unitsSold, 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.16),_transparent_24%),linear-gradient(135deg,_#fff7ed_0%,_#ffffff_46%,_#fff1f2_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2 sm:px-6 lg:px-8 lg:py-3">
        <section className="overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_26px_60px_rgba(15,23,42,0.1)]">
          <div className="flex flex-col gap-3 border-b border-zinc-100 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-3 sm:p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.25)]">
              <LineChartIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-500">
                Donut Stars admin
              </p>
              <h1 className="mt-1.5 text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">
                Sales analytics
              </h1>
              <p className="mt-1.5 hidden max-w-2xl text-xs leading-4 text-zinc-600 sm:block">
                Orders and revenue trends, best sellers, category mix, and peak order hours over the
                selected window.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>

              <div className="inline-flex items-center gap-1 rounded-2xl border border-zinc-200 bg-white p-1">
                {rangeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setDays(option)}
                    className={`h-8 rounded-xl px-3 text-xs font-semibold transition ${
                      days === option
                        ? "bg-rose-500 text-white"
                        : "text-zinc-600 hover:bg-rose-50 hover:text-rose-600"
                    }`}
                  >
                    {option}d
                  </button>
                ))}
              </div>

              <button
                onClick={() => setReloadTick((current) => current + 1)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 transition hover:border-rose-200 hover:bg-rose-50"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </section>
        ) : null}

        {!data && loading ? (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-zinc-500">Loading analytics...</p>
          </section>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-3 lg:grid-cols-2">
              <article className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Orders per day
                    </p>
                    <p className="text-xs text-zinc-500">Last {data.days} days</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                </div>
                <ChartContainer config={dailyOrdersConfig} className="mt-3 aspect-auto h-56 w-full">
                  <BarChart data={data.daily}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatShortDate}
                      minTickGap={24}
                    />
                    <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <ChartTooltip
                      content={<ChartTooltipContent labelFormatter={(value) => formatShortDate(String(value))} />}
                    />
                    <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </article>

              <article className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Revenue per day
                    </p>
                    <p className="text-xs text-zinc-500">Incl. shipping &middot; last {data.days} days</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white">
                    <LineChartIcon className="h-5 w-5" />
                  </div>
                </div>
                <ChartContainer config={dailyRevenueConfig} className="mt-3 aspect-auto h-56 w-full">
                  <AreaChart data={data.daily}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatShortDate}
                      minTickGap={24}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => formatShortDate(String(value))}
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Area
                      dataKey="revenue"
                      type="monotone"
                      fill="var(--color-revenue)"
                      fillOpacity={0.18}
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </article>
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <article className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Best sellers
                    </p>
                    <p className="text-xs text-zinc-500">By units sold &middot; item revenue, excl. shipping</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>

                {data.bestSellers.length === 0 ? (
                  <p className="mt-6 text-center text-sm text-zinc-500">No sales in this period.</p>
                ) : (
                  <>
                    <ChartContainer config={bestSellersConfig} className="mt-3 aspect-auto h-56 w-full">
                      <BarChart
                        data={data.bestSellers}
                        layout="vertical"
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis
                          dataKey="productName"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={110}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="unitsSold" fill="var(--color-unitsSold)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>

                    <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Product</th>
                            <th className="px-3 py-2 font-semibold">Category</th>
                            <th className="px-3 py-2 text-right font-semibold">Units</th>
                            <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {data.bestSellers.map((row) => (
                            <tr key={row.productId}>
                              <td className="px-3 py-2 font-medium text-zinc-900">{row.productName}</td>
                              <td className="px-3 py-2 text-zinc-500">{row.categoryName ?? "--"}</td>
                              <td className="px-3 py-2 text-right text-zinc-700">{row.unitsSold}</td>
                              <td className="px-3 py-2 text-right text-zinc-700">
                                {formatCurrency(row.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </article>

              <article className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Revenue by category
                    </p>
                    <p className="text-xs text-zinc-500">Item revenue, excl. shipping</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                    <PieChartIcon className="h-5 w-5" />
                  </div>
                </div>

                {data.categoryBreakdown.length === 0 ? (
                  <p className="mt-6 text-center text-sm text-zinc-500">No sales in this period.</p>
                ) : (
                  <>
                    <ChartContainer config={categoryConfig} className="mt-3 aspect-auto h-56 w-full">
                      <BarChart
                        data={data.categoryBreakdown}
                        layout="vertical"
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCurrency(Number(value))}
                        />
                        <YAxis
                          dataKey="categoryName"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={70}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                        />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {data.categoryBreakdown.map((row) => (
                            <Cell
                              key={row.categoryId}
                              fill={categoryColors[row.categoryName ?? ""] ?? fallbackCategoryColor}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>

                    <div className="mt-3 space-y-1.5">
                      {data.categoryBreakdown.map((row) => (
                        <div key={row.categoryId} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: categoryColors[row.categoryName ?? ""] ?? fallbackCategoryColor,
                              }}
                            />
                            <span className="font-medium text-zinc-900">{row.categoryName ?? "Unknown"}</span>
                            <span className="text-zinc-400">
                              {totalUnitsInWindow > 0
                                ? `${Math.round((row.unitsSold / totalUnitsInWindow) * 100)}% of units`
                                : ""}
                            </span>
                          </div>
                          <span className="font-semibold text-zinc-700">{formatCurrency(row.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Peak order hours
                  </p>
                  <p className="text-xs text-zinc-500">Order volume by hour of day &middot; last {data.days} days</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <ChartContainer config={peakHoursConfig} className="mt-3 aspect-auto h-56 w-full">
                <BarChart data={data.peakHours}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatHourLabel}
                    interval={2}
                  />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent labelFormatter={(value) => formatHourLabel(Number(value))} />}
                  />
                  <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
