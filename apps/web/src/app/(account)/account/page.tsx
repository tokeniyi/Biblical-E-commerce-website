import Link from "next/link";
import { formatCents } from "@your-app/shared";
import { StatusBadge, formatDate } from "@/components/account/OrderStatus";
import { PageContent } from "@/components/shell/StorefrontShell";
import { Icon } from "@/components/ui/Icon";
import { eyebrow, pageHeading, panel, textLink } from "@/components/ui/styles";
import { requireCustomerPage } from "@/lib/api/account";

export const metadata = { title: "Your account" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** A07 Account overview. */
export default async function AccountPage({ searchParams }: Props) {
  const welcome = (await searchParams).welcome === "1";
  const { api, session } = await requireCustomerPage("/account");
  const [{ orders }, profile, wishlist] = await Promise.all([api.account.orders(), api.account.profile(), api.wishlist.items()]);
  const recent = orders.slice(0, 3);
  const address = profile.addresses.find((a) => a.isDefault) ?? profile.addresses.at(0);

  return (
    <PageContent screen="A07">
      <div className="flex flex-col gap-1">
        <p className={eyebrow}>Your account</p>
        <h1 className={pageHeading}>Hello, {session.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted">{session.email}</p>
      </div>
      {welcome ? (
        <p role="status" className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
          Your account is ready. We’ve sent a verification link to {session.email} (see the Dev Inbox in this demo).
        </p>
      ) : null}
      {!profile.emailVerified && !welcome ? (
        <p role="status" className="rounded-xl bg-gold-soft p-4 text-sm">
          Please verify your email address to receive order updates.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/account/orders", icon: "package" as const, label: "Orders", value: String(orders.length) },
          { href: "/account/wishlist", icon: "heart" as const, label: "Wishlist", value: String(wishlist.items.length) },
          { href: "/account/addresses", icon: "truck" as const, label: "Saved addresses", value: String(profile.addresses.length) },
        ].map((tile) => (
          <Link key={tile.href} href={tile.href} className={`${panel} flex-row items-center gap-4 hover:shadow-lift`}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon name={tile.icon} />
            </span>
            <span>
              <span className="block font-display text-2xl font-semibold">{tile.value}</span>
              <span className="text-sm text-muted">{tile.label}</span>
            </span>
          </Link>
        ))}
      </div>

      <section aria-labelledby="recent-orders" className={panel}>
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="font-display text-xl font-semibold">
            Recent orders
          </h2>
          <Link href="/account/orders" className={textLink}>
            All orders
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">
            No orders yet. <Link href="/categories" className={textLink}>Start browsing</Link>
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <Link href={`/account/orders/${o.id}`} className="font-semibold text-ink hover:text-brand">
                    {o.id}
                  </Link>
                  <span className="block text-muted">
                    {formatDate(o.placedAt)} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </span>
                </span>
                <StatusBadge status={o.fulfillmentStatus} />
                <span className="font-semibold">{formatCents(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="profile-heading" className={panel}>
          <h2 id="profile-heading" className="font-display text-xl font-semibold">
            Profile
          </h2>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Name</dt>
            <dd>{profile.name}</dd>
            <dt className="text-muted">Email</dt>
            <dd>
              {profile.email} {profile.emailVerified ? "· Verified" : "· Not verified"}
            </dd>
          </dl>
          <Link href="/account/profile" className={textLink}>
            View profile
          </Link>
        </section>
        <section aria-labelledby="address-heading" className={panel}>
          <h2 id="address-heading" className="font-display text-xl font-semibold">
            Default address
          </h2>
          {address ? (
            <address className="text-sm not-italic">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.zip}
            </address>
          ) : (
            <p className="text-sm text-muted">No saved address. Save one at checkout.</p>
          )}
          <Link href="/account/addresses" className={textLink}>
            Manage addresses
          </Link>
        </section>
      </div>
    </PageContent>
  );
}
