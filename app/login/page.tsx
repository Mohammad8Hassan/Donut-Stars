"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/useAuth";
import AuthShell from "../components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd]);

  const { setUser: setAuthUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user, password: pwd }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || "Login failed");
      }

      const data = await res.json();
      setAuthUser(data.user);

      const redirectTo = searchParams.get("from") || "/";
      router.replace(redirectTo);
    } catch (err: any) {
      setErrMsg(err.message || "Login failed");
      errRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      badge="Welcome back"
      title="Sign in and get back to your box."
      description="Jump back into Donut Stars with a cleaner, faster checkout-ready login flow inspired by the rest of the storefront."
      footerLabel="Need an account?"
      footerHref="/register"
      footerCta="Create one"
      asideTitle="Fresh picks, faster checkout, and your account in one place."
      asideDescription="Your saved details, account settings, and next donut run all start here. Sign in to keep the experience smooth from browse to checkout."
      asideStats={[
        { label: "Fast access", value: "Saved session" },
        { label: "Account hub", value: "Orders + details" },
        { label: "Checkout ready", value: "Cart stays close" },
      ]}
      icon={LogIn}
      imageSide="right"
    >
      {errMsg && (
        <p
          ref={errRef}
          tabIndex={-1}
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 outline-none"
          aria-live="assertive"
        >
          {errMsg}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-zinc-800"
          >
            Email
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 shadow-sm transition focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-100">
            <Mail className="h-4 w-4 text-zinc-400" />
            <input
              type="email"
              id="email"
              ref={userRef}
              autoComplete="email"
              onChange={(e) => setUser(e.target.value)}
              value={user}
              required
              placeholder="you@example.com"
              className="h-full w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-zinc-800"
            >
              Password
            </label>
            <Link
              href="/register"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-rose-500"
            >
              Need help?
            </Link>
          </div>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 shadow-sm transition focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-100">
            <Lock className="h-4 w-4 text-zinc-400" />
            <input
              type="password"
              id="password"
              onChange={(e) => setPwd(e.target.value)}
              value={pwd}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-full w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
