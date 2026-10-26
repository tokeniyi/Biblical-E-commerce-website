import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/AdminShell";

/** Everything under /admin except the staff sign-in page (B01). */
export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
