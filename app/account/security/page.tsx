"use client";

import { useState } from "react";
import { authFetch } from "@/app/api/authFetch";
import { AccountCard, AccountInput, AccountSectionHeading } from "@/app/components/account/AccountUi";

export default function SecurityPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    const newErrors = {
      currentPassword: form.currentPassword ? "" : "Please enter your current password.",
      newPassword:
        form.newPassword.length >= 8 ? "" : "New password must be at least 8 characters.",
      confirmPassword:
        form.confirmPassword === form.newPassword ? "" : "Passwords do not match.",
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) return;

    setSaving(true);

    try {
      const res = await authFetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSaveMessage({ type: "error", text: data?.error ?? "We couldn't update your password. Please try again." });
        return;
      }

      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSaveMessage({
        type: "success",
        text: "Your password was updated. You'll need to sign in again on any other devices.",
      });
    } catch {
      setSaveMessage({ type: "error", text: "We couldn't update your password. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountCard>
      <AccountSectionHeading
        title="Change your password"
        description="Enter your current password, choose a stronger replacement, and confirm it before saving."
      />

      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <AccountInput
          label="Current Password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
          error={errors.currentPassword || undefined}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <AccountInput
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            error={errors.newPassword || undefined}
          />
          <AccountInput
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            error={errors.confirmPassword || undefined}
          />
        </div>

        {saveMessage ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              saveMessage.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {saveMessage.text}
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500 disabled:opacity-70"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </AccountCard>
  );
}
