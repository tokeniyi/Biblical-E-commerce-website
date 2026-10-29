import type { ReactNode } from "react";
import { AccountNav } from "@/components/shell/AccountNav";
import { StorefrontShell } from "@/components/shell/StorefrontShell";

/**
 * Account pages: storefront header plus the A07 sidebar. Each page checks
 * for a customer session itself (A14 otherwise, keeping the page as
 * returnTo), and every /api/account handler checks again.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontShell>
      <AccountNav />
      {children}
    </StorefrontShell>
  );
}
