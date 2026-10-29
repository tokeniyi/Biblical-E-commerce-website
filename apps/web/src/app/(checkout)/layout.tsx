import type { ReactNode } from "react";
import { StorefrontShell } from "@/components/shell/StorefrontShell";

/** Checkout keeps the storefront header (Figma O01–O07); each page renders its CheckoutStepper. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
