import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { WishlistNotice } from "@/components/account/WishlistNotice";
import { serverApi } from "@/lib/api/server";
import { NavLink } from "./NavLink";
import { SiteFooter } from "./SiteFooter";

/** Header navigation from Figma C01; category slugs match the seed. */
const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/categories/study", label: "Study Bibles" },
  { href: "/categories/devotional", label: "Devotional" },
  { href: "/categories/children", label: "Children" },
  { href: "/help/shipping-returns", label: "Help" },
] as const;

/** Null when the API is unreachable: the header still renders, count unknown. */
async function loadCartCount(): Promise<number | null> {
  try {
    const api = await serverApi();
    return (await api.getSession()).cartCount;
  } catch {
    return null;
  }
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2"
    >
      Skip to content
    </a>
  );
}

export async function StorefrontShell({ children }: { children: ReactNode }) {
  const cartCount = await loadCartCount();
  const cartLabel = cartCount === null ? "–" : String(cartCount);

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="flex flex-col gap-2 border-b border-line px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-xl font-semibold">
            BIBLE STORE
          </Link>
          <form action="/search" role="search" className="w-full sm:w-[360px]">
            <label htmlFor="site-search" className="sr-only">
              Search Bibles
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search Bibles, translations, ISBN…"
              className="w-full border border-line p-2 text-sm"
            />
          </form>
          <nav aria-label="Your store" className="text-sm">
            <ul className="flex items-center gap-2">
              <li>
                <NavLink href="/account" matchPrefix>
                  Account
                </NavLink>
              </li>
              <li aria-hidden="true">|</li>
              <li>
                <NavLink href="/account/wishlist">Wishlist</NavLink>
              </li>
              <li aria-hidden="true">|</li>
              <li>
                <NavLink href="/cart">{`Cart (${cartLabel})`}</NavLink>
              </li>
            </ul>
          </nav>
        </div>
        <nav aria-label="Primary" className="text-sm">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Suspense fallback={null}>
        <WishlistNotice />
      </Suspense>
      <div className="flex flex-1 flex-col md:flex-row">{children}</div>
      <SiteFooter />
    </div>
  );
}

/**
 * Main landmark for a page body inside any shell. `screen` tags the Figma
 * frame it implements (e.g. "C01"), which /__dev/screens and E2E check.
 */
export function PageContent({ children, screen }: { children: ReactNode; screen?: string }) {
  return (
    <main id="main" data-screen={screen} className="flex min-w-0 flex-1 flex-col gap-4 p-6">
      {children}
    </main>
  );
}
