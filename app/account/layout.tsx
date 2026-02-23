"use client";

import { Protected } from "../components/Protected";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Protected>{children}</Protected>;
}
