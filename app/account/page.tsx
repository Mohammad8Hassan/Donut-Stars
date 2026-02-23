"use client";

import Link from "next/link";
import { Protected } from "../components/Protected";

export default function AccountPage() {
  const sections = [
    {
      title: "Account Details",
      subtitle: "Name, email, password",
      href: "/account/details",
    },
    {
      title: "Previous Orders",
      subtitle: "View your order history",
      href: "/account/orders",
    },
    {
      title: "Addresses",
      subtitle: "Manage shipping addresses",
      href: "/account/addresses",
    },
  ];
  
  return (
    <>
      {/* Background gradient + dots (matches checkout/payment) */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-pink-300 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-purple-300 opacity-20 blur-3xl" />

        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="black" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="mx-auto max-w-4xl py-10 px-4 flex flex-col gap-8">
        <h1 className="text-3xl font-bold">My Account</h1>

        <div className="flex flex-col gap-6">
          {/* Account Details */}
          <Link
            href="/account/details"
            className="bg-white border shadow-sm rounded-xl p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">Account Details</h2>
            <p className="text-gray-600 mt-1 text-sm">
              Manage your name, email, profile information, and preferences.
            </p>
          </Link>

          {/* Addresses */}
          <Link
            href="/account/addresses"
            className="bg-white border shadow-sm rounded-xl p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">Addresses</h2>
            <p className="text-gray-600 mt-1 text-sm">
              Edit your shipping and billing addresses.
            </p>
          </Link>

          {/* Previous Orders */}
          <Link
            href="/account/orders"
            className="bg-white border shadow-sm rounded-xl p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">Previous Orders</h2>
            <p className="text-gray-600 mt-1 text-sm">
              Review your order history and reorder past favorites.
            </p>
          </Link>

          {/* Security Settings */}
          <Link
            href="/account/security"
            className="bg-white border shadow-sm rounded-xl p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">Security & Password</h2>
            <p className="text-gray-600 mt-1 text-sm">
              Change your password, manage login options, and secure your account.
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
