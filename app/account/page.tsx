"use client";

import Link from "next/link";
import { ArrowRight, Lock, MapPin, PackageCheck, Truck, UserRound } from "lucide-react";
import { AccountCard, AccountSectionHeading } from "../components/account/AccountUi";
import { useAuth } from "../context/useAuth";

export default function AccountPage() {
  const { user } = useAuth();
  const sections = [
    {
      title: "Account Details",
      subtitle: "Name, email, and profile preferences",
      href: "/account/details",
      icon: <UserRound className="h-5 w-5" />,
    },
    {
      title: "Active Orders",
      subtitle: "Live status of orders in progress",
      href: "/account/active-orders",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      title: "Previous Orders",
      subtitle: "View your order history",
      href: "/account/orders",
      icon: <PackageCheck className="h-5 w-5" />,
    },
    {
      title: "Addresses",
      subtitle: "Manage shipping addresses",
      href: "/account/addresses",
      icon: <MapPin className="h-5 w-5" />,
    },
    {
      title: "Security & Password",
      subtitle: "Keep your account protected",
      href: "/account/security",
      icon: <Lock className="h-5 w-5" />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {user?.roleName === "admin" ? (
        <AccountCard className="border-rose-200 bg-gradient-to-br from-white via-rose-50 to-amber-50">
          <AccountSectionHeading
            eyebrow="Admin access"
            title="Store dashboard available"
            description="You have admin permissions, so you can switch from customer account tools into the live operations dashboard."
          />

          <Link
            href="/admin"
            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
          >
            Open admin dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </AccountCard>
      ) : null}

      <AccountCard>
        <AccountSectionHeading
          title="Choose where you want to go"
          description="Jump straight into the part of your account you want to manage."
        />

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-rose-50 p-4 transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_18px_36px_rgba(244,63,94,0.12)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white transition group-hover:bg-rose-500">
                  {section.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black leading-tight tracking-tight text-zinc-950">{section.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">{section.subtitle}</p>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-rose-500">
                    Open section
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </AccountCard>
    </div>
  );
}
