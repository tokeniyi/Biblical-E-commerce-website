import Link from "next/link";
import { redirect } from "next/navigation";
import { loginPath, safeReturnTo } from "@your-app/shared";
import { AuthFrame } from "@/components/account/AuthFrame";
import { destinationLabel } from "@/components/account/destination";
import { LoginForm } from "@/components/account/auth/LoginForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { serverApi } from "@/lib/api/server";
import { first, type SearchParams } from "@/lib/search-params";

type Props = { searchParams: SearchParams };

/** A14 "Session expired variant": the destination is kept, nothing was submitted. */
/** A01 for this destination, keeping a ♡ save carried from the storefront. */
function signInHref(returnTo: string, save: string | undefined): string {
  return save ? `${loginPath(returnTo)}&save=${encodeURIComponent(save)}` : loginPath(returnTo);
}

function SessionExpired({ returnTo, save }: { returnTo: string; save: string | undefined }) {
  const viewingOrder = returnTo.startsWith("/account/orders/");
  return (
    <section aria-labelledby="expired-title" className={`${panel} flex-1`}>
      <h2 id="expired-title" className="sr-only">
        Session expired
      </h2>
      <StatusMessage role="alert" title="Your session has expired">
        Sign in again to {viewingOrder ? "view your order" : "continue"}. Your cart is still saved; no new purchase was submitted.
      </StatusMessage>
      <p className="text-base">
        Return destination: <span className="font-mono">{returnTo}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={signInHref(returnTo, save)} className={primaryButton}>
          Sign in again
        </Link>
        <Link href="/" className={textLink}>
          Continue shopping
        </Link>
      </div>
    </section>
  );
}

/** A14 "Signed out / protected route variant". */
function SignInRequired({ returnTo, save }: { returnTo: string; save: string | undefined }) {
  return (
    <section aria-labelledby="required-title" className={`${panel} flex-1`}>
      <h2 id="required-title" className="sr-only">
        Sign in required
      </h2>
      <p className="text-base">
        Sign in to access your profile, orders, wishlist and reviews. You can shop and check out as a guest.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={signInHref(returnTo, save)} className={primaryButton}>
          Sign in
        </Link>
        <p className="flex flex-wrap gap-2 text-sm">
          <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="underline">
            Create account
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/checkout/identity" className="underline">
            Guest checkout
          </Link>
        </p>
      </div>
      <p className="text-sm">
        Guest order tracking remains available through{" "}
        <Link href="/orders/lookup" className="underline">
          secure verification
        </Link>
        .
      </p>
    </section>
  );
}

/**
 * A01 Sign in, and A14 "Please sign in to continue" when a guarded page
 * sent the visitor here (`reason=session-expired | auth-required | signed-out`).
 * returnTo is made safe on the server before it is used anywhere.
 */
export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const reason = first(sp.reason);
  const returnTo = safeReturnTo(first(sp.returnTo));
  const save = first(sp.save);

  if (reason === "session-expired" || reason === "auth-required" || reason === "signed-out") {
    return (
      <PageContent screen="A14">
        <h1 className="text-[28px] font-semibold text-ink">Please sign in to continue</h1>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {reason === "session-expired" ? (
            <SessionExpired returnTo={returnTo} save={save} />
          ) : (
            <SignInRequired returnTo={returnTo} save={save} />
          )}
        </div>
      </PageContent>
    );
  }

  // Already signed in as a customer: nothing to do here.
  const { session } = await (await serverApi()).getSession();
  if (session.kind === "customer") redirect(returnTo);

  return (
    <AuthFrame screen="A01" title="Sign in">
      <LoginForm returnTo={returnTo} returnLabel={destinationLabel(returnTo)} save={save ?? null} />
    </AuthFrame>
  );
}
