import Link from "next/link";
import type { ReactNode } from "react";
import type { Session, StaffRole } from "@/lib/api/types";
import { serverApi } from "@/lib/api/server";
import { NavLink } from "./NavLink";
import { SignOutButton } from "./SignOutButton";
import { Sidebar, SidebarList } from "./Sidebar";
import { Logo, SkipLink } from "./StorefrontShell";

/** Sidebar from Figma B02. */
const ADMIN_NAV = [
  { href: "/admin", label: "Overview", matchPrefix: false },
  { href: "/admin/insights", label: "UX insights", matchPrefix: true },
  { href: "/admin/products", label: "Products", matchPrefix: true },
  { href: "/admin/inventory", label: "Inventory", matchPrefix: true },
  { href: "/admin/orders", label: "Orders", matchPrefix: true },
  { href: "/admin/customers", label: "Customers", matchPrefix: true },
  { href: "/admin/discounts", label: "Discounts", matchPrefix: true },
  { href: "/admin/content", label: "Content", matchPrefix: true },
] as const;

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  catalog_editor: "Catalog editor",
  fulfillment: "Fulfillment",
  content_editor: "Content editor",
  support: "Support",
};

async function loadSession(): Promise<Session> {
  try {
    const api = await serverApi();
    return (await api.getSession()).session;
  } catch {
    return { kind: "anonymous" };
  }
}

/**
 * Separate /admin layout. It only *displays* the staff identity: every
 * /api/admin handler enforces role checks itself (Phase 5, spec §5.7).
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const session = await loadSession();
  const staffLabel =
    session.kind === "staff" ? `Staff: ${session.name} · ${ROLE_LABELS[session.role]}` : "Not signed in as staff";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SkipLink />
      <header className="border-b border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link href="/admin" aria-label="Bible Store admin home">
            <Logo suffix="Admin" />
          </Link>
          <div className="w-full sm:w-[360px]">
            <label htmlFor="admin-search" className="sr-only">
              Search admin records
            </label>
            {/* Destination not specified in Figma or the spec: open question. */}
            <input id="admin-search" type="search" placeholder="Search admin records…" disabled className="w-full text-sm disabled:bg-panel" />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full bg-panel px-3 py-1.5 font-medium">{staffLabel}</span>
            <SignOutButton redirectTo="/admin/login">Sign out</SignOutButton>
            <Link href="/" className="text-muted hover:text-brand">
              View store
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 md:flex-row md:p-6">
        <Sidebar
          label="Admin menu"
          note={<p className="leading-snug text-muted">Role permissions apply to every mutation.</p>}
        >
          <SidebarList>
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} matchPrefix={item.matchPrefix}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </SidebarList>
        </Sidebar>
        {children}
      </div>
    </div>
  );
}
