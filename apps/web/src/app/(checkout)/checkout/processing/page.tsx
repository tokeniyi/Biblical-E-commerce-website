import { redirect } from "next/navigation";
import { CheckoutFrame } from "@/components/checkout/CheckoutFrame";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { ProcessingStatus } from "@/components/checkout/ProcessingStatus";
import { loadCheckout } from "@/lib/api/checkout";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** O06 Processing your payment (E15 uncertain branch lives here). */
export default async function CheckoutProcessingPage({ searchParams }: Props) {
  const raw = (await searchParams).intent;
  const intentId = Array.isArray(raw) ? raw[0] : raw;
  if (!intentId) redirect("/checkout/payment");
  const view = await loadCheckout();

  return (
    <CheckoutFrame
      screen="O06"
      title="Processing your payment"
      stepper={<CheckoutStepper current="payment" title="Checkout / Payment processing / not confirmed" linkPrevious={false} />}
      aside={
        view && view.cart.lines.length > 0 ? (
          <>
            <OrderSummary lines={view.cart.lines} totals={view.quote} />
            <p className="text-sm">Cart and delivery details retained during processing.</p>
          </>
        ) : null
      }
    >
      <ProcessingStatus intentId={intentId} amountCents={view?.quote.totalCents ?? 0} />
    </CheckoutFrame>
  );
}
