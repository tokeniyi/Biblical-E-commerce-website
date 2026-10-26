import type { ReactNode } from "react";
import { StorefrontShell } from "@/components/shell/StorefrontShell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
