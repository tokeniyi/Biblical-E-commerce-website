import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { container } from "@/components/ui/styles";
import { serverApi } from "@/lib/api/server";
import { NavLink } from "./NavLink";
import { SiteFooter } from "./SiteFooter";

/** Header navigation; category slugs match the seed. */
const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/categories/study", label: "Study Bibles" },
  { href: "/categories/devotional", label: "Devotional" },
  { href: "/categories/children", label: "Children" },
  { href: "/categories/large-print", label: "Large Print" },
  { href: "/categories/gift-editions", label: "Gifts" },
  { href: "/help/shipping-returns", label: "Help" },
] as const;

type HeaderState = { cartCount: number | null; firstName: string | null };

/** Null count when the API is unreachable: the header still renders, count unknown. */
async function loadHeaderState(): Promise<HeaderState> {
  try {
    const api = await serverApi();
    const { session, cartCount } = await api.getSession();
    const firstName = session.kind === "anonymous" ? null : (session.name.split(" ")[0] ?? session.name);
    return { cartCount, firstName };
  } catch {
    return { cartCount: null, firstName: null };
  }
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:p-2"
    >
      Skip to content
    </a>
  );
}

export function Logo({ suffix }: { suffix?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-gold-soft">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 4v16M7 9h10" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Bible Store{suffix ? <span className="ml-1.5 font-sans text-sm font-medium text-muted">{suffix}</span> : null}
      </span>
    </span>
  );
}

const headerIcon =
  "relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink hover:bg-band aria-[current=page]:bg-band";

export async function StorefrontShell({ children }: { children: ReactNode }) {
  const { cartCount, firstName } = await loadHeaderState();
  const cartLabel = cartCount === null ? "–" : String(cartCount);

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <div className="bg-ink text-xs text-white/90">
        <p className={`${container} flex items-center justify-center gap-2 py-2 text-center`}>
          <Icon name="truck" className="h-4 w-4" />
          <span>Standard shipping $5 · Express in 2–3 days · Unopened returns within 30 days</span>
        </p>
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className={`${container} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3`}>
          <Link href="/" aria-label="Bible Store home" data-track="header-logo">
            <Logo />
          </Link>
          <form action="/search" role="search" className="order-3 w-full md:order-none md:max-w-md md:flex-1">
            <label htmlFor="site-search" className="sr-only">
              Search Bibles
            </label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Search Bibles, translations, ISBN…"
                className="w-full !rounded-full !pl-10 text-sm"
              />
            </div>
          </form>
          <nav aria-label="Your store">
            <ul className="flex items-center gap-1">
              <li>
                <NavLink href="/account" matchPrefix className={headerIcon} plain>
                  <Icon name="user" />
                  <span className="hidden sm:inline">{firstName ? `Hi, ${firstName}` : "Account"}</span>
                  {firstName ? null : <span className="sr-only sm:hidden">Account</span>}
                </NavLink>
              </li>
              <li>
                <NavLink href="/account/wishlist" className={headerIcon} plain>
                  <Icon name="heart" />
                  <span className="hidden sm:inline">Wishlist</span>
                  <span className="sr-only sm:hidden">Wishlist</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/cart" className={`${headerIcon} bg-white ring-1 ring-line`} plain ariaLabel={`Cart (${cartLabel})`}>
                  <Icon name="bag" />
                  <span aria-hidden="true" className="hidden sm:inline">
                    Cart
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white"
                  >
                    {cartLabel}
                  </span>
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
        <nav aria-label="Primary" className="border-t border-line/70">
          <ul className={`${container} flex gap-x-6 overflow-x-auto whitespace-nowrap text-sm`}>
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="inline-block border-b-2 border-transparent py-3 font-medium text-ink/80 hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink"
                  plain
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className={`${container} flex flex-1 flex-col gap-6 py-6 md:flex-row md:py-8`}>{children}</div>
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
    <main id="main" data-screen={screen} className="flex min-w-0 flex-1 flex-col gap-6">
      {children}
    </main>
  );
}
