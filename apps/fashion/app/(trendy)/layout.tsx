import type { Metadata } from "next";
import Link from "next/link";
import { BagLink } from "./ordering";
import "./trendy.css";

export const metadata: Metadata = {
  title: { default: "Trendy Luxury — Streetwear Edit", template: "%s | Trendy Luxury" },
  description: "An unofficial Trendy Luxury concept featuring jerseys, sneakers and accessories.",
  robots: { index: false, follow: false },
};

export default function TrendyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className="trendy">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="concept-note">Unofficial concept · Sample products and prices</div>
        <header className="trendy-header">
          <div className="frame header-content">
            <Link href="/" className="wordmark" aria-label="Trendy Luxury home">
              TRENDY<span>LUXURY</span>
            </Link>
            <nav aria-label="Store">
              <Link href="/collection">Shop</Link>
              <Link href="/#the-edit">The Edit</Link>
            </nav>
            <BagLink />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="trendy-footer">
          <div className="frame footer-content">
            <div>
              <Link href="/" className="wordmark" aria-label="Trendy Luxury home">
                TRENDY<span>LUXURY</span>
              </Link>
              <p>Unofficial storefront concept by Treasure Okeniyi.</p>
            </div>
            <nav aria-label="Footer">
              <Link href="/collection">Shop the edit</Link>
              <Link href="/#the-edit">The lookbook</Link>
              <Link href="/shopping-bag">Your bag</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
