import Link from "next/link";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import { Icon } from "@/components/ui/Icon";
import { container } from "@/components/ui/styles";
import { NewsletterForm } from "./NewsletterForm";
import { Logo } from "./StorefrontShell";

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { href: "/categories/study", label: "Study Bibles" },
      { href: "/categories/devotional", label: "Devotional Bibles" },
      { href: "/categories/children", label: "Children’s Bibles" },
      { href: "/categories/large-print", label: "Large Print" },
      { href: "/categories", label: "All categories" },
    ],
  },
  {
    heading: "Help",
    links: [
      { href: "/help/shipping-returns", label: "Help" },
      { href: "/help/shipping-returns", label: "Shipping & returns" },
      { href: "/help/translations", label: "Translation guide" },
      { href: "/orders/lookup", label: "Find an order" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/account", label: "Your account" },
      { href: "/account/orders", label: "Order history" },
      { href: "/account/wishlist", label: "Wishlist" },
      { href: "/register", label: "Create account" },
    ],
  },
] as const;

/** Site footer: shop/help/account links, newsletter and privacy controls. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line bg-white">
      <div className={`${container} grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]`}>
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Bibles for study, devotion and gifting, with honest guidance on translations, bindings and print sizes.
          </p>
          <NewsletterForm />
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={`Footer ${col.heading}`} className="text-sm">
            <h2 className="mb-3 font-semibold text-ink">{col.heading}</h2>
            <ul className="flex flex-col gap-2 text-muted">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className={`${container} flex flex-col gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between`}>
          <p>© 2026 Bible Store · Demo storefront with sample data</p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <li>
              <Link href="/help/privacy" className="hover:text-brand">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/help/terms" className="hover:text-brand">
                Terms
              </Link>
            </li>
            <li>
              <CookieSettingsButton />
            </li>
            <li className="flex items-center gap-1">
              <Icon name="shield" className="h-4 w-4" /> USD / English
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
