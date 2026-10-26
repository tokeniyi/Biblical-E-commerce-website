import Link from "next/link";

/**
 * Footer from the Figma frames. Privacy and Terms have no wireframed screen,
 * so they stay plain text (listed as an open question in the progress doc).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line px-6 py-3 text-sm">
      <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/help/shipping-returns" className="hover:underline">
            Help
          </Link>
        </li>
        <li aria-hidden="true">|</li>
        <li>
          <Link href="/help/shipping-returns" className="hover:underline">
            Shipping &amp; returns
          </Link>
        </li>
        <li aria-hidden="true">|</li>
        <li>Privacy</li>
        <li aria-hidden="true">|</li>
        <li>Terms</li>
        <li aria-hidden="true">·</li>
        <li>USD / English</li>
        <li aria-hidden="true">·</li>
        <li>Wireframe only</li>
      </ul>
    </footer>
  );
}
