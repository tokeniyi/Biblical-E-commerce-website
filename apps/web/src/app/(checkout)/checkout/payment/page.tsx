import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCents, type CheckoutView } from "@your-app/shared";
import { CartChanges } from "@/components/checkout/CartChanges";
import { CheckoutFrame } from "@/components/checkout/CheckoutFrame";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { ShippingUnavailable } from "@/components/checkout/EdgeStates";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { fieldBox, fieldLabel, panel, primaryButton, textLink } from "@/components/ui/styles";
import { serverApi } from "@/lib/api/server";
import { hasItems, loadCheckout } from "@/lib/api/checkout";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** O07 only for a verified decline of this browser's intent; anything else is O05. */
async function isKnownDecline(intentId: string | undefined): Promise<boolean> {
  if (!intentId) return false;
  try {
    return (await (await serverApi()).checkout.getIntent(intentId)).status === "declined";
  } catch {
    return false;
  }
}

function methodLine(view: CheckoutView): string {
  const o = view.shippingOptions.find((s) => s.id === (view.quote.shippingMethod ?? "standard"));
  return o ? `${o.label} ${formatCents(o.priceCents)} · ${o.estimate}` : "";
}

/** O05 Payment & review; O07 is its `?status=failed` variant. */
export default async function CheckoutPaymentPage({ searchParams }: Props) {
  const sp = await searchParams;
  const intentId = first(sp.intent);
  const failed = first(sp.status) === "failed" && (await isKnownDecline(intentId));
  const screen = failed ? "O07" : "O05";
  const title = failed ? "Payment couldn’t be completed" : "Payment & review order";

  const view = await loadCheckout();
  if (!view) {
    return (
      <PageContent screen={screen}>
        <h1 className="text-[28px] font-semibold text-ink">{title}</h1>
        <NetworkError />
      </PageContent>
    );
  }
  if (!hasItems(view)) redirect("/cart");
  const { delivery } = view;
  if (!delivery) redirect("/checkout/delivery");

  const { address } = delivery;
  const summary = <OrderSummary lines={view.cart.lines} totals={view.quote} />;

  if (failed) {
    const names = view.cart.lines.map((l) => `${l.productName} × ${String(l.quantity)}`).join(" · ");
    const option = view.shippingOptions.find((s) => s.id === (view.quote.shippingMethod ?? "standard"));
    return (
      <CheckoutFrame
        screen="O07"
        title={title}
        stepper={<CheckoutStepper current="payment" title="Checkout / Payment failed / action required" />}
        aside={summary}
      >
        <StatusMessage role="alert" title="Card declined — payment not completed">
          Try another payment method or check the card details. No confirmed paid order was created.
        </StatusMessage>
        <section aria-labelledby="retained-title" className={panel}>
          <h2 id="retained-title" className="text-base font-semibold">
            Retained checkout details
          </h2>
          <div className="text-base leading-snug">
            <p>{names}</p>
            <p>
              Delivery to {address.fullName}, {address.line1}, {address.city}
            </p>
            {option ? (
              <p>
                {option.label} shipping · Estimated {option.estimate}
              </p>
            ) : null}
            <p>Amount due {formatCents(view.quote.totalCents)}</p>
          </div>
        </section>
        <fieldset className={fieldBox}>
          <legend className={`${fieldLabel} float-left mb-1 w-full`}>Choose payment method</legend>
          <div className="flex flex-wrap gap-x-6">
            <label className="flex items-center gap-2">
              <input type="radio" name="retry-method" defaultChecked />
              Different credit / debit card
            </label>
            <label className="flex items-center gap-2 text-muted">
              <input type="radio" name="retry-method" disabled />
              Alternative method
            </label>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/checkout/payment" className={primaryButton}>
            Retry / enter new card
          </Link>
          <Link href="/checkout/delivery" className={textLink}>
            Edit delivery
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/cart" className={textLink}>
            Back to cart
          </Link>
        </div>
        <p className="text-sm">
          If you’re unsure whether you were charged:{" "}
          <Link href={`/checkout/processing?intent=${encodeURIComponent(intentId ?? "")}`} className="underline">
            check payment status
          </Link>
          , or{" "}
          <Link href="/help/shipping-returns" className="underline">
            contact support
          </Link>
          .
        </p>
      </CheckoutFrame>
    );
  }

  const blocked = view.changes.length > 0 || view.coverage === "unsupported";
  return (
    <CheckoutFrame
      screen="O05"
      title={title}
      stepper={<CheckoutStepper current="payment" title="Checkout / 4 / Payment & review" />}
      aside={
        <>
          {summary}
          <StatusMessage title="Review before paying">
            Confirm items, address and shipping. Inventory/prices may change; reconcile before the payment request.
          </StatusMessage>
        </>
      }
    >
      {view.changes.length > 0 && view.reconciledQuote ? (
        <CartChanges changes={view.changes} reconciled={view.reconciledQuote} />
      ) : null}
      {view.coverage === "unsupported" ? <ShippingUnavailable /> : null}
      <section aria-labelledby="delivery-review-title" className={panel}>
        <h2 id="delivery-review-title" className="text-base font-semibold">
          Delivery review
        </h2>
        <div className="text-sm leading-snug">
          <p>
            {address.fullName} · {address.line1}
          </p>
          <p>
            {address.city}, {address.state} {address.zip} · {address.country}
          </p>
          <p>{methodLine(view)}</p>
        </div>
        <p className="flex flex-wrap gap-2 text-sm">
          <Link href="/checkout/delivery" className="underline">
            Edit address
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/checkout/shipping" className="underline">
            Edit method
          </Link>
        </p>
      </section>
      <PaymentForm totalCents={view.quote.totalCents} defaultName={address.fullName} blocked={blocked} />
    </CheckoutFrame>
  );
}
