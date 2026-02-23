"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Focus username field on mount
  useEffect(() => {
    userRef.current?.focus();
  }, []);

  // Reset error message when typing
  useEffect(() => {
    setErrMsg("");
  }, [user, pwd]);

  const {setUser : setAuthUser} = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user, password: pwd }),
        credentials: "include", // important for cookies
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || "Login failed");
      }

      const data = await res.json();

      console.log("Logged in user:", data);
      setAuthUser(data.user);

      // On success, redirect to dashboard or where user came from
      const redirectTo = searchParams.get("from") || "/";
      router.replace(redirectTo);
    } catch (err: any) {
      setErrMsg(err.message || "Login failed");
      errRef.current?.focus();
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Sign In
        </h1>

        {errMsg && (
          <p
            ref={errRef}
            className="text-red-500 text-sm mb-4 text-center"
            aria-live="assertive"
          >
            {errMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="text"
              id="email"
              ref={userRef}
              autoComplete="off"
              onChange={(e) => setUser(e.target.value)}
              value={user}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              onChange={(e) => setPwd(e.target.value)}
              value={pwd}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
          >
            Sign In
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Need an account?{" "}
          <a
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Register
          </a>
        </p>
      </div>
    </main>
  );
}
