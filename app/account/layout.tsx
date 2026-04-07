"use client";

import { AccountShell } from "../components/account/AccountUi";
import { Protected } from "../components/Protected";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Protected>
      <AccountShell>{children}</AccountShell>
    </Protected>
  );
}
