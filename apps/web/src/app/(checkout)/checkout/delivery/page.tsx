import { redirect } from "next/navigation";
import { CheckoutFrame } from "@/components/checkout/CheckoutFrame";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { DeliveryForm } from "@/components/checkout/DeliveryForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { hasItems, loadCheckout } from "@/lib/api/checkout";

/** O03 Contact & delivery address (E07 invalid input, E14 unsupported region). */
export default async function CheckoutDeliveryPage() {
  const view = await loadCheckout();
  if (!view) {
    return (
      <PageContent screen="O03">
        <h1 className="text-[28px] font-semibold text-ink">Contact &amp; delivery address</h1>
        <NetworkError />
      </PageContent>
    );
  }
  if (!hasItems(view)) redirect("/cart");

  return (
    <CheckoutFrame
      screen="O03"
      title="Contact & delivery address"
      stepper={<CheckoutStepper current="delivery" title="Checkout / 2 / Delivery details" />}
      aside={
        <>
          <OrderSummary lines={view.cart.lines} totals={view.quote} />
          <StatusMessage title="Delivery privacy">
            Your contact details are used to deliver and verify this order. No marketing consent is required to purchase.
          </StatusMessage>
        </>
      }
    >
      <DeliveryForm view={view} />
    </CheckoutFrame>
  );
}
