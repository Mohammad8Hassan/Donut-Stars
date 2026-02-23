"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/useAuth";

export function Protected({
  children,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, checked, isLoading, revalidate } = useAuth();
  const router = useRouter();

  // Attempt silent recovery once
  useEffect(() => {
    if (!user && checked && !isLoading) {
      revalidate();
    }
  }, [user, checked, isLoading, revalidate]);

  if (!checked || isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push(redirectTo);
    return null;
  }

  return <>{children}</>;
}
