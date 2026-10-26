import type { ReactNode } from "react";
import { StorefrontShell } from "@/components/shell/StorefrontShell";

/** Checkout keeps the storefront header; the CheckoutStepper arrives in Phase 2. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
