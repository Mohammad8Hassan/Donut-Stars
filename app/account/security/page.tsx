"use client";

import { useState } from "react";
import { AccountCard, AccountInput, AccountSectionHeading } from "@/app/components/account/AccountUi";

export default function SecurityPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  return (
    <AccountCard>
      <AccountSectionHeading
        title="Change your password"
        description="Enter your current password, choose a stronger replacement, and confirm it before saving."
      />

      <form className="mt-6 grid gap-5">
        <AccountInput
          label="Current Password"
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <AccountInput
            label="New Password"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          />
          <AccountInput
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
          />
        </div>

        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Password submission is still not connected to an API on this page yet, so this redesign keeps the existing behavior and prepares the layout for the next implementation step.
        </div>

        <div>
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
          >
            Update Password
          </button>
        </div>
      </form>
    </AccountCard>
  );
}
