import Link from "next/link";
import { formatCents } from "@your-app/shared";
import { StatusBadge, formatDate } from "@/components/account/OrderStatus";
import { PageContent } from "@/components/shell/StorefrontShell";
import { pageHeading, panel, primaryButton } from "@/components/ui/styles";
import { requireCustomerPage } from "@/lib/api/account";

export const metadata = { title: "Orders" };

/** A10 Order history. */
export default async function OrdersPage() {
  const { api } = await requireCustomerPage("/account/orders");
  const { orders } = await api.account.orders();
  return (
    <PageContent screen="A10">
      <h1 className={pageHeading}>Orders</h1>
      {orders.length === 0 ? (
        <div className={panel}>
          <p>You haven’t placed any orders yet.</p>
          <Link href="/categories" className={`${primaryButton} self-start`}>
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((o) => (
            <li key={o.id} className={`${panel} sm:flex-row sm:items-center sm:justify-between`}>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-lg font-semibold">{o.id}</h2>
                  <StatusBadge status={o.fulfillmentStatus} />
                </div>
                <p className="text-muted">
                  Placed {formatDate(o.placedAt)} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  {o.firstLine ? ` · ${o.firstLine.productName}${o.itemCount > 1 ? " and more" : ""}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">{formatCents(o.totalCents)}</span>
                <Link href={`/account/orders/${o.id}`} className="rounded-full border border-ink/25 px-4 py-2 text-sm font-semibold hover:border-ink" aria-label={`View order ${o.id}`}>
                  View order
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContent>
  );
}
