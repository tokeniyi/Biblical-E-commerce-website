import Link from "next/link";
import { primaryButton, textLink } from "@/components/ui/styles";

/**
 * E19 404. Used for unknown routes, unknown or draft products and, later,
 * orders the viewer may not see (never disclose that they exist).
 */
export function NotFoundPanel({ headingLevel = 1 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div data-state="E19" className="flex flex-col gap-3.5">
      <Heading className="text-[28px] font-semibold">We can’t find that page</Heading>
      <p className="text-base">The link may be outdated or the product may no longer be listed.</p>
      <div className="flex flex-wrap items-center gap-3">
        <a href="#site-search" className={primaryButton}>
          Search Bibles
        </a>
        <Link href="/categories" className={textLink}>
          Browse categories
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/" className={textLink}>
          Home
        </Link>
      </div>
    </div>
  );
}
