"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mail, Lock, Sparkles, User2 } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Unable to create your account");
        return;
      }

      router.replace("/");
    } catch {
      setError("Something went wrong while creating your account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="New account"
      title="Create your Donut Stars account."
      description="Set up your profile with a brighter, more premium sign-up flow that matches the store's cards, colors, and overall feel."
      footerLabel="Already have an account?"
      footerHref="/login"
      footerCta="Sign in"
      asideTitle="A smoother way to order your favorites again and again."
      asideDescription="Create your account to keep your details close, move through checkout faster, and manage everything from one cozy account area."
      asideStats={[
        { label: "Easy setup", value: "3 quick fields" },
        { label: "Cookie login", value: "Signed in on success" },
        { label: "Better flow", value: "Store-matched UI" },
      ]}
      icon={Sparkles}
      imageSide="left"
    >
      {error && (
        <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-zinc-800">
            Full name
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 shadow-sm transition focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-100">
            <User2 className="h-4 w-4 text-zinc-400" />
            <input
              id="name"
              className="h-full w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-800">
            Email
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 shadow-sm transition focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-100">
            <Mail className="h-4 w-4 text-zinc-400" />
            <input
              id="email"
              type="email"
              className="h-full w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-800">
            Password
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 shadow-sm transition focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-100">
            <Lock className="h-4 w-4 text-zinc-400" />
            <input
              id="password"
              type="password"
              className="h-full w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              placeholder="Create a secure password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-950 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Register
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
