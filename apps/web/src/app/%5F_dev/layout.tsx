import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { mockToolsEnabled } from "@/lib/dev/mock-tools";

const DEV_NAV = [
  { href: "/__dev/screens", label: "Screens" },
  { href: "/__dev/states", label: "Edge states" },
  { href: "/__dev/inbox", label: "Dev Inbox" },
  { href: "/", label: "Storefront" },
  { href: "/admin", label: "Admin" },
] as const;

/** Dev-only pages (spec §7). 404 when NEXT_PUBLIC_MOCK_TOOLS is off. */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (!mockToolsEnabled()) notFound();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line px-6 py-3">
        <p className="text-xl font-semibold">BIBLE STORE / DEV</p>
        <nav aria-label="Dev pages" className="mt-2 text-sm">
          <ul className="flex flex-wrap gap-x-6">
            {DEV_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="flex flex-col gap-4 p-6 pb-24">
        {children}
      </main>
    </div>
  );
}
