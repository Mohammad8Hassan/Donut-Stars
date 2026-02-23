"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-6 bg-white rounded-xl border">
      <h1 className="text-2xl font-bold mb-4">Create account</h1>

      <input
        className="w-full border rounded-lg px-3 py-2 mb-3"
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <input
        className="w-full border rounded-lg px-3 py-2 mb-3"
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        className="w-full border rounded-lg px-3 py-2 mb-3"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button className="w-full bg-pink-500 text-white py-2 rounded-lg">
        Register
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}
