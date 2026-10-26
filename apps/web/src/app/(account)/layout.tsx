import type { ReactNode } from "react";
import { AccountNav } from "@/components/shell/AccountNav";
import { StorefrontShell } from "@/components/shell/StorefrontShell";

/**
 * Account pages: storefront header plus the A07 sidebar. The sign-in guard
 * (A14 redirect) and per-handler authorization arrive in Phase 3.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontShell>
      <AccountNav />
      {children}
    </StorefrontShell>
  );
}
