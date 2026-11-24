import type { Metadata } from "next";
import Link from "next/link";
import { BagLink } from "./shopper";
import "./style.css";

export const metadata: Metadata = {
  title: { default: "Studio Form — The Linen Edit", template: "%s | Studio Form" },
  description:
    "An independent fashion storefront concept featuring a capsule of linen dresses, shirts and tailoring.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <div className="demo-strip">
          Portfolio demo <span aria-hidden>·</span> Paystack test payments
        </div>
        <header className="site-header">
          <div className="shell header-inner">
            <nav aria-label="Store">
              <Link href="/studio/#collection">Shop</Link>
            </nav>
            <Link className="brand" href="/studio">
              STUDIO FORM<span aria-hidden>.</span>
            </Link>
            <nav aria-label="Your bag">
              <BagLink />
            </nav>
          </div>
        </header>
        <main id="content">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <Link className="brand" href="/studio">
                STUDIO FORM<span aria-hidden>.</span>
              </Link>
              <p>Fashion storefront concept by Treasure Okeniyi.</p>
            </div>
            <Link href="/owner">Store owner</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
