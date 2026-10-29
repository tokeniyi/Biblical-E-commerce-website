import Link from "next/link";
import { formatCents, type AccountOrderDetail } from "@your-app/shared";
import { placedDate, statusLabel } from "@/components/account/format";
import { ReorderButton } from "@/components/account/ReorderButton";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton } from "@/components/ui/styles";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

type Props = { params: Promise<{ id: string }> };

const PAYMENT: Record<AccountOrderDetail["order"]["paymentStatus"], string> = {
  pending_payment: "Payment pending",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

/** What the customer may do at this status; each action is checked again when used. */
function statusNote(data: AccountOrderDetail): string {
  const placed = `Placed ${placedDate(data.order.placedAt)}.`;
  switch (data.status) {
    case "processing":
      return `${placed} Cancellation eligible until fulfillment; eligibility is checked again when requested.`;
    case "shipped":
      return `${placed} This order has shipped, so it can no longer be cancelled.`;
    case "delivered":
      return `${placed} Delivered ${data.order.deliveredAt ? placedDate(data.order.deliveredAt) : ""}.`;
    case "cancelled":
      return `${placed} This order was cancelled.`;
  }
}

/**
 * A11 Order details: the read-only paid snapshot. Someone else's order is
 * the same 404 as a missing one. Cancel only while unfulfilled; returns
 * and reviews only once delivered; Reorder never charges.
 */
export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const returnTo = `/account/orders/${encodeURIComponent(id)}`;
  await requireCustomerPage(returnTo);
  const data = await loadAccountData(returnTo, (api) => api.account.order(id));
  if (!data) {
    return (
      <PageContent screen="A11">
        <h1 className="text-[28px] font-semibold text-ink">Order details</h1>
        <NetworkError />
      </PageContent>
    );
  }
  const { order } = data;
  const orderPath = `/orders/${encodeURIComponent(order.id)}`;
  const lines = order.lines.map((l) => ({ ...l, lineTotalCents: l.unitPriceCents * l.quantity }));
  const address = order.shippingAddress;

  return (
    <PageContent screen="A11">
      <h1 className="text-[28px] font-semibold text-ink">Order details</h1>
      <StatusMessage title={`${order.id} / ${statusLabel(data.status)} · ${PAYMENT[order.paymentStatus]} ${formatCents(order.totals.totalCents)}`}>
        {statusNote(data)}
      </StatusMessage>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[560px] text-left font-mono text-[13px] leading-snug">
          <thead className="bg-band">
            <tr>
              <th scope="col" className="p-3 font-semibold">Item / variant</th>
              <th scope="col" className="p-3 font-semibold">Quantity</th>
              <th scope="col" className="p-3 font-semibold">Line total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.sku} className="border-t border-band align-top">
                <th scope="row" className="p-3 font-normal">
                  {l.productName} · {l.sku} · {l.variantLabel}
                </th>
                <td className="p-3">{l.quantity}</td>
                <td className="p-3">{formatCents(l.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section aria-labelledby="delivery-title" className={panel}>
            <h2 id="delivery-title" className="text-base font-semibold">
              Delivery snapshot
            </h2>
            <p className="text-sm">
              {address.fullName} · {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.zip} · {data.shippingLabel} shipping
              <br />
              {data.status === "delivered" && order.deliveredAt
                ? `Delivered ${placedDate(order.deliveredAt)}`
                : `Estimated ${data.estimate}`}
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={`${orderPath}/tracking`} className={primaryButton}>
              Track
            </Link>
            {data.canCancel ? (
              <Link href={`${orderPath}/cancel`} className="text-sm underline">
                Cancel if eligible
              </Link>
            ) : data.status === "shipped" ? (
              <p className="text-sm text-muted">Cancellation unavailable: this order has shipped.</p>
            ) : null}
          </div>

          {data.status === "delivered" ? (
            <section aria-labelledby="after-delivery-title" className="flex flex-col gap-2 text-sm">
              <h2 id="after-delivery-title" className="sr-only">
                After delivery
              </h2>
              {data.canReturn ? (
                <p>
                  <Link href={`${orderPath}/returns/new`} className="underline">
                    Return eligible items
                  </Link>
                </p>
              ) : (
                <p className="text-muted">The 30-day return window for this order has closed.</p>
              )}
              {data.reviewable.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {data.reviewable.map((item) => (
                    <li key={item.sku}>
                      <Link href={`/account/orders/${encodeURIComponent(order.id)}/items/${encodeURIComponent(item.sku)}/review`} className="underline">
                        Review {item.productName}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ReorderButton orderId={order.id} />
            <span aria-hidden="true">·</span>
            <Link href="/account/orders" className="underline">
              Back to orders
            </Link>
          </div>
        </div>
        <aside aria-label="Order summary" className="w-full md:w-[300px] md:shrink-0">
          <OrderSummary lines={lines} totals={order.totals} title="Paid order summary" note={`${PAYMENT[order.paymentStatus]} · ${order.paymentMethodLabel}`} />
        </aside>
      </div>
    </PageContent>
  );
}
