import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents, type Order } from "@your-app/shared";
import { OrderTimeline, StatusBadge, formatDate } from "@/components/account/OrderStatus";
import { PageContent } from "@/components/shell/StorefrontShell";
import { Breadcrumbs } from "@/components/storefront/Breadcrumbs";
import { BookCover } from "@/components/storefront/BookCover";
import { pageHeading, panel, textLink } from "@/components/ui/styles";
import { authRedirectOn, requireCustomerPage } from "@/lib/api/account";
import { ApiError } from "@/lib/api/client";

type Props = { params: Promise<{ id: string }> };

const PAYMENT_LABEL: Record<Order["paymentStatus"], string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

/** A11 Order details (owner only; anything else is a plain 404). */
export default async function AccountOrderPage({ params }: Props) {
  const { id } = await params;
  const returnTo = `/account/orders/${encodeURIComponent(id)}`;
  const { api } = await requireCustomerPage(returnTo);
  let order: Order;
  try {
    order = (await api.account.order(id)).order;
  } catch (error) {
    authRedirectOn(error, returnTo);
    if (error instanceof ApiError && error.code === "not_found") notFound();
    throw error;
  }
  const t = order.totals;
  const a = order.shippingAddress;

  return (
    <PageContent screen="A11">
      <Breadcrumbs crumbs={[{ label: "Account", href: "/account" }, { label: "Orders", href: "/account/orders" }, { label: order.id }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageHeading}>Order {order.id}</h1>
          <p className="text-sm text-muted">Placed {formatDate(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.fulfillmentStatus} />
      </div>

      <section aria-labelledby="progress-heading" className={panel}>
        <h2 id="progress-heading" className="sr-only">
          Progress
        </h2>
        <OrderTimeline order={order} />
        {order.tracking ? (
          <p className="text-sm">
            Tracking: {order.tracking.carrier} {order.tracking.number}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="items-heading" className={panel}>
          <h2 id="items-heading" className="font-display text-xl font-semibold">
            Items
          </h2>
          <ul className="divide-y divide-line">
            {order.lines.map((line) => (
              <li key={line.sku} className="flex items-center gap-4 py-3">
                <div className="w-16 shrink-0">
                  <BookCover title={line.productName} translation={line.variantLabel.split(" · ")[0]} binding={line.variantLabel.split(" · ")[1]} decorative />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{line.productName}</p>
                  <p className="text-muted">{line.variantLabel}</p>
                  <p className="text-muted">
                    Qty {line.quantity} · {formatCents(line.unitPriceCents)} each
                  </p>
                </div>
                <p className="font-semibold">{formatCents(line.unitPriceCents * line.quantity)}</p>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-5">
          <section aria-labelledby="summary-heading" className={panel}>
            <h2 id="summary-heading" className="font-display text-xl font-semibold">
              Summary
            </h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
              <dt>Subtotal</dt>
              <dd>{formatCents(t.subtotalCents)}</dd>
              <dt>Shipping ({t.shippingMethod === "express" ? "Express" : "Standard"})</dt>
              <dd>{formatCents(t.shippingCents)}</dd>
              <dt>Tax</dt>
              <dd>{formatCents(t.taxCents)}</dd>
              {t.discountCents > 0 ? (
                <>
                  <dt>Discount{t.promoCode ? ` (${t.promoCode})` : ""}</dt>
                  <dd>−{formatCents(t.discountCents)}</dd>
                </>
              ) : null}
              <dt className="border-t border-line pt-2 font-semibold">Total</dt>
              <dd className="border-t border-line pt-2 font-semibold">{formatCents(t.totalCents)}</dd>
            </dl>
            <p className="text-sm text-muted">
              {PAYMENT_LABEL[order.paymentStatus]} · {order.paymentMethodLabel}
            </p>
          </section>
          <section aria-labelledby="ship-heading" className={panel}>
            <h2 id="ship-heading" className="font-display text-xl font-semibold">
              Delivery address
            </h2>
            <address className="text-sm not-italic">
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.zip}
            </address>
          </section>
          <p className="text-sm">
            Need help? <Link href="/help/shipping-returns" className={textLink}>Shipping &amp; returns</Link>
          </p>
        </div>
      </div>
    </PageContent>
  );
}
