"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import {
  ChevronRight,
  Lock,
  MapPin,
  Menu,
  PackageCheck,
  Settings2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/app/context/useAuth";

type AccountNavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

const accountNavItems: AccountNavItem[] = [
  {
    href: "/account/details",
    label: "Details",
    description: "Name, email, and profile info",
    icon: <UserRound className="h-4 w-4" />,
  },
  {
    href: "/account/active-orders",
    label: "Active Orders",
    description: "Live status of orders in progress",
    icon: <Truck className="h-4 w-4" />,
  },
  {
    href: "/account/orders",
    label: "Orders",
    description: "Past purchases and delivery details",
    icon: <PackageCheck className="h-4 w-4" />,
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    description: "Saved shipping destinations",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    href: "/account/security",
    label: "Security",
    description: "Password and account protection",
    icon: <Lock className="h-4 w-4" />,
  },
];

function getInitials(name: string | undefined, email: string | undefined) {
  const value = name?.trim() || email?.trim() || "Account";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const initials = getInitials(user?.name, user?.email);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeNavItem = accountNavItems.find((item) => item.href === pathname);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden items-stretch">
      <div className="mx-auto grid w-full flex-1 max-w-7xl gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-4">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/70 bg-zinc-950 text-white shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.35),_transparent_40%)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-black tracking-[0.12em] text-white ring-1 ring-white/15">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  {/* <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200">
                    Donut Stars account
                  </p> */}
                  <h1 className="mt-1 truncate text-lg font-black leading-tight tracking-tight">
                    {user?.name || "Your account"}
                  </h1>
                  <p className="truncate text-xs text-white/75">{user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-expanded={mobileNavOpen}
                aria-controls="account-mobile-nav"
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/25 hover:bg-white/10 lg:hidden"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
                    {activeNavItem?.icon ?? <Settings2 className="h-4 w-4" />}
                  </span>
                  <span className="truncate text-sm font-semibold text-white">
                    {activeNavItem?.label ?? "Account menu"}
                  </span>
                </span>
                {mobileNavOpen ? (
                  <X className="h-5 w-5 shrink-0 text-white/80" />
                ) : (
                  <Menu className="h-5 w-5 shrink-0 text-white/80" />
                )}
              </button>

              {/* <div className="mt-3 hidden rounded-2xl border border-white/15 bg-white/5 px-3 py-2 sm:block">
                <div className="flex items-center gap-2 text-rose-200">
                  <Settings2 className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">Control center</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  Update your profile, track orders, and manage delivery details from one place.
                </p>
              </div> */}
            </div>

            <nav
              id="account-mobile-nav"
              className={`flex-1 space-y-1.5 p-3 lg:block ${mobileNavOpen ? "" : "hidden"}`}
            >
              {accountNavItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                      isActive
                        ? "border-rose-300/40 bg-white text-zinc-950 shadow-[0_16px_30px_rgba(15,23,42,0.15)]"
                        : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? "bg-rose-500 text-white" : "bg-white/10 text-rose-200"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isActive ? "text-zinc-950" : "text-white"}`}>
                        {item.label}
                      </p>
                      <p className={`hidden text-xs leading-4 sm:block ${isActive ? "text-zinc-500" : "text-white/70"}`}>
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${isActive ? "text-zinc-400" : "text-white/45"}`} />
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function AccountHero({
  eyebrow,
  title,
  description,
  action,
  stats,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  stats?: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-amber-50 shadow-[0_22px_55px_rgba(15,23,42,0.1)]">
      <div className="flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-500">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">{title}</h2>
          <p className="mt-1 hidden max-w-2xl text-xs leading-5 text-zinc-600 sm:block">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {stats?.length ? (
        <div className="grid gap-px border-t border-white/70 bg-white/70 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white/70 px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{stat.label}</p>
              <p className="text-base font-black tracking-tight text-zinc-950">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function AccountCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-zinc-200/80 bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:p-5 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function AccountSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">{eyebrow}</p>
      ) : null}
      <h3 className="mt-1 text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">{title}</h3>
      {description ? <p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p> : null}
    </div>
  );
}

export function AccountInput({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-800">{label}</span>
      <input
        {...props}
        className={`h-11 w-full rounded-2xl border bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-4 ${
          error
            ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100"
            : "border-zinc-200 focus:border-rose-300 focus:ring-rose-100"
        } ${props.className ?? ""}`.trim()}
      />
      {error ? <span className="mt-1 block text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}
