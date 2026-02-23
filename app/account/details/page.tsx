"use client";

import { userData } from "@/app/context/AuthContext";
import { useAuth } from "@/app/context/useAuth";
import { useEffect, useState } from "react";

export default function AccountDetailsPage() {

  const {user, setUser} = useAuth();

  
  
  const [saving, setSaving] = useState(false);

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

    // Reset errors
    const newErrors = {
      name: form.name.trim() === "",
      email: !form.email.includes("@"),
      phone: form.phone != "" ? form.phone.trim().length < 6 : false,
    };

    setErrors(newErrors);

    // Block submission if any field invalid
    if (Object.values(newErrors).some(Boolean)) return;

    setSaving(true);

    const response = await fetch("/api/account/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // credentials: "include",
      },
      body: JSON.stringify({
        id: user!.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
      }),
    });

    if(!response.ok) {
      alert("Failed to save changes.");
      setSaving(false);
      return;
    }

    const data = await response.json();
    setUser(data.user);

    setSaving(false);
    alert("Saved!");
  };

  if (!user) {
    return <div className="mx-auto max-w-3xl py-10 px-4">Please log in to view account details.</div>
  }

  return (
    <>
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-pink-300 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-purple-300 opacity-20 blur-3xl" />
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="black" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="mx-auto max-w-3xl py-10 px-4 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Account Details</h1>

        <div className="bg-white border shadow-sm rounded-xl p-6">
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 ${errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 ${errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 ${errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>

            <button
              type="submit"
              className="mt-4 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 disabled:opacity-70"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
