import Link from "next/link";
import { formatCents } from "@your-app/shared";
import { placedDate, plural, statusLabel } from "@/components/account/format";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

const RETURN_TO = "/account";

/** A07 Your account: protected; cards link to the same routes as the sidebar. */
export default async function AccountPage() {
  await requireCustomerPage(RETURN_TO);
  const data = await loadAccountData(RETURN_TO, (api) => api.account.overview());
  if (!data) {
    return (
      <PageContent screen="A07">
        <h1 className="text-[28px] font-semibold text-ink">Your account</h1>
        <NetworkError />
      </PageContent>
    );
  }
  const { addresses, orders } = data;
  const latest = orders.latest;

  return (
    <PageContent screen="A07">
      <h1 className="text-[28px] font-semibold text-ink">Your account</h1>
      <p className="text-base">Welcome, {data.name}. Manage your details and purchases.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="card-profile" className={panel}>
          <h2 id="card-profile" className="text-base font-semibold">
            Profile
          </h2>
          <p className="text-sm">
            {data.email}
            <br />
            {data.emailVerified ? (
              "Email verified"
            ) : (
              <>
                Email not verified ·{" "}
                <Link href="/verify-email" className="underline">
                  Verify email
                </Link>
              </>
            )}
          </p>
          <Link href="/account/profile" className={`${primaryButton} self-start`}>
            Edit profile
          </Link>
        </section>
        <section aria-labelledby="card-addresses" className={panel}>
          <h2 id="card-addresses" className="text-base font-semibold">
            Addresses
          </h2>
          <p className="text-sm">
            {plural(addresses.count, "saved address", "saved addresses")}
            {addresses.defaultPlace ? (
              <>
                <br />
                {addresses.defaultPlace} · Default
              </>
            ) : null}
          </p>
          <Link href="/account/addresses" className={`${primaryButton} self-start`}>
            Manage addresses
          </Link>
        </section>
        <section aria-labelledby="card-orders" className={panel}>
          <h2 id="card-orders" className="text-base font-semibold">
            Orders
          </h2>
          <p className="text-sm">
            {plural(orders.count, "order", "orders")} · {orders.processing} processing
            {latest ? (
              <>
                <br />
                Latest: {latest.id} · {formatCents(latest.totalCents)}
              </>
            ) : null}
          </p>
          <Link href="/account/orders" className={`${primaryButton} self-start`}>
            View orders
          </Link>
        </section>
        <section aria-labelledby="card-wishlist" className={panel}>
          <h2 id="card-wishlist" className="text-base font-semibold">
            Wishlist &amp; reviews
          </h2>
          <p className="text-sm">
            {plural(data.wishlistCount, "saved Bible", "saved Bibles")} · {plural(data.reviewCount, "review", "reviews")}
            <br />
            {plural(data.awaitingReviewCount, "eligible delivered item", "eligible delivered items")} awaiting review
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/account/wishlist" className={primaryButton}>
              Wishlist
            </Link>
            <Link href="/account/reviews" className={textLink}>
              My reviews
            </Link>
          </div>
        </section>
      </div>
      {latest ? (
        <StatusMessage title={`Latest order / ${statusLabel(latest.status)}`}>
          {latest.id} · Placed {placedDate(latest.placedAt)} ·{" "}
          <Link href={`/account/orders/${encodeURIComponent(latest.id)}`} className="underline">
            Details
          </Link>
          .{" "}
          <Link href={`/orders/${encodeURIComponent(latest.id)}/tracking`} className="underline">
            Track
          </Link>
          . Cancellation availability is determined by fulfillment status, not by editing the paid cart.
        </StatusMessage>
      ) : null}
    </PageContent>
  );
}
