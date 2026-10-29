import Link from "next/link";
import type { ReactNode } from "react";
import { PageContent } from "@/components/shell/StorefrontShell";
import { panel } from "@/components/ui/styles";

/**
 * The "Customer account boundary" panel drawn beside every sign-in and
 * sign-up screen (A01–A05), with its arrows as real links.
 */
export function AccountBoundary() {
  return (
    <section aria-labelledby="boundary-title" className={`${panel} flex-1`}>
      <h2 id="boundary-title" className="text-base font-semibold">
        Customer account boundary
      </h2>
      <p className="text-base">Account routes require a customer session. Checkout remains available to guests.</p>
      <p className="text-sm">Preserve cart and safe returnTo destination across login. Do not allow external redirect URLs.</p>
      <p className="text-sm">
        <Link href="/admin/login" className="underline">
          Admin login is separate
        </Link>
        . Customer accounts have no admin permissions.
      </p>
      <p className="flex flex-wrap gap-2 text-sm">
        <Link href="/checkout/identity" className="underline">
          Continue guest checkout
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/" className="underline">
          Back to shopping
        </Link>
      </p>
    </section>
  );
}

type AuthFrameProps = {
  screen: string;
  title: string;
  children: ReactNode;
  /** Right column; the account boundary panel unless a screen draws something else. */
  aside?: ReactNode;
};

/** A01–A06 layout: heading, a 560px main column and the boundary panel (stacked on mobile). */
export function AuthFrame({ screen, title, children, aside = <AccountBoundary /> }: AuthFrameProps) {
  return (
    <PageContent screen={screen}>
      <h1 className="text-[28px] font-semibold text-ink">{title}</h1>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-4 md:w-[560px] md:shrink-0">{children}</div>
        {aside}
      </div>
    </PageContent>
  );
}
