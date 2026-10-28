"use client";

import { useAuth } from "@/app/context/useAuth";
import { useEffect, useState } from "react";
import { AccountCard, AccountInput, AccountSectionHeading } from "@/app/components/account/AccountUi";

export default function AccountDetailsPage() {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [errors, setErrors] = useState({
    name: false,
    email: false,
    phone: false,
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    const newErrors = {
      name: form.name.trim() === "",
      email: !form.email.includes("@"),
      phone: form.phone != "" ? form.phone.trim().length < 6 : false,
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) return;

    setSaving(true);

    try {
      const response = await fetch("/api/account/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user!.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
        }),
      });

      if (!response.ok) {
        setSaveMessage("We couldn't save your changes. Please try again.");
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setSaveMessage("Your account details were updated.");
    } catch {
      setSaveMessage("We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <AccountCard>
        <p className="text-sm text-zinc-600">Please log in to view account details.</p>
      </AccountCard>
    );
  }

  return (
    <AccountCard>
      <AccountSectionHeading
        title="Basic account information"
        description="Use the same details you want applied to orders, receipts, and future account updates."
      />

      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <AccountInput
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={errors.name ? "Please enter your name." : undefined}
          />
          <AccountInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email ? "Please enter a valid email." : undefined}
          />
        </div>

        <AccountInput
          label="Phone Number"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          error={errors.phone ? "Phone numbers should be at least 6 characters." : undefined}
        />

        {saveMessage ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              saveMessage.includes("updated")
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {saveMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500 disabled:opacity-70"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </AccountCard>
  );
}
