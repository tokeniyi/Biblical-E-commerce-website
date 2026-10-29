import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents, type OrderConfirmation } from "@your-app/shared";
import { DeliveryPanel } from "@/components/checkout/DeliveryDetails";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";

type Props = { params: Promise<{ id: string }> };

const PLACED = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function load(id: string): Promise<OrderConfirmation | null> {
  try {
    return await (await serverApi()).orders.getConfirmation(id);
  } catch (error) {
    // Unknown and not-yours look the same (E19), never disclosing the order.
    if (error instanceof ApiError && error.code === "not_found") notFound();
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

/** O08 Order confirmed: only after verified payment; owner or this browser's order session. */
export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const data = await load(id);
  if (!data) {
    return (
      <PageContent screen="O08">
        <h1 className="text-[28px] font-semibold text-ink">Order confirmed</h1>
        <NetworkError />
      </PageContent>
    );
  }
  const { order } = data;
  const lines = order.lines.map((l) => ({ ...l, lineTotalCents: l.unitPriceCents * l.quantity }));

  return (
    <PageContent screen="O08">
      <h1 className="text-[28px] font-semibold text-ink">Order confirmed</h1>
      <ol aria-label="Checkout steps" className="flex flex-wrap gap-1 text-sm">
        {["Identity", "Delivery", "Payment", "Confirmation"].map((step, i) => (
          <li key={step} className="flex gap-1">
            {i > 0 ? <span aria-hidden="true">→</span> : null}
            <span>
              <span aria-hidden="true">✓ </span>
              {step}
              <span className="sr-only"> (complete)</span>
            </span>
          </li>
        ))}
      </ol>
      <StatusMessage role="status" title="✓ Thank you — payment confirmed">
        Order {order.id} · Placed {PLACED.format(new Date(order.placedAt))} · {formatCents(order.totals.totalCents)} paid. Receipt
        sent to {order.email}.
      </StatusMessage>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[560px] text-left font-mono text-[13px] leading-snug">
          <thead className="bg-band">
            <tr>
              <th scope="col" className="p-3 font-semibold">Purchased item</th>
              <th scope="col" className="p-3 font-semibold">SKU</th>
              <th scope="col" className="p-3 font-semibold">Qty</th>
              <th scope="col" className="p-3 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.sku} className="border-t border-band align-top">
                <th scope="row" className="p-3 font-normal">
                  {l.productName} · {l.variantLabel}
                </th>
                <td className="p-3">{l.sku}</td>
                <td className="p-3">{l.quantity}</td>
                <td className="p-3">{formatCents(l.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <DeliveryPanel
            name={order.shippingAddress.fullName}
            email={order.email}
            address={order.shippingAddress}
            method={`${data.shippingLabel} · ${formatCents(order.totals.shippingCents)} · Estimated ${data.estimate} ${String(data.estimateYear)}`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/orders/${encodeURIComponent(order.id)}/tracking`} className={primaryButton}>
              Track order
            </Link>
            <Link href="/" className={textLink}>
              Continue shopping
            </Link>
          </div>
          {data.isGuest ? (
            <section aria-labelledby="guest-account-title" className={panel}>
              <h2 id="guest-account-title" className="text-base font-semibold">
                Guest? Save your order to an account
              </h2>
              <p className="text-sm">
                Optional: create an account with your verified order email to see this purchase in your order history.
              </p>
              <p className="flex flex-wrap gap-2 text-sm">
                <Link href={`/register?order=${encodeURIComponent(order.id)}`} className="underline">
                  Create account
                </Link>
                <span aria-hidden="true">·</span>
                <Link href="/" className="underline">
                  Not now
                </Link>
              </p>
            </section>
          ) : null}
        </div>
        <aside aria-label="Order summary" className="w-full md:w-[320px] md:shrink-0">
          <OrderSummary lines={lines} totals={order.totals} title="Paid order summary" note={`Paid · ${order.paymentMethodLabel}`} />
        </aside>
      </div>
    </PageContent>
  );
}
