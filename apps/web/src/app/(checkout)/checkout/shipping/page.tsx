import { redirect } from "next/navigation";
import { CheckoutFrame } from "@/components/checkout/CheckoutFrame";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { DeliveryPanel, chosenMethodLine } from "@/components/checkout/DeliveryDetails";
import { ShippingUnavailable } from "@/components/checkout/EdgeStates";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { ShippingMethodForm } from "@/components/checkout/ShippingMethodForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { hasItems, loadCheckout } from "@/lib/api/checkout";

/** O04 Choose delivery method; E14 when the address's region has no rates. */
export default async function CheckoutShippingPage() {
  const view = await loadCheckout();
  if (!view) {
    return (
      <PageContent screen="O04">
        <h1 className="text-[28px] font-semibold text-ink">Choose delivery method</h1>
        <NetworkError />
      </PageContent>
    );
  }
  if (!hasItems(view)) redirect("/cart");
  const { delivery } = view;
  if (!delivery) redirect("/checkout/delivery");

  const panel = (
    <DeliveryPanel
      name={delivery.address.fullName}
      email={delivery.email}
      address={delivery.address}
      method={chosenMethodLine(view)}
    />
  );

  return (
    <CheckoutFrame
      screen="O04"
      title="Choose delivery method"
      stepper={<CheckoutStepper current="method" title="Checkout / 3 / Delivery method" />}
      aside={<OrderSummary lines={view.cart.lines} totals={view.quote} />}
    >
      {view.coverage === "unsupported" ? (
        <ShippingUnavailable address={panel} />
      ) : (
        <>
          {panel}
          <ShippingMethodForm view={view} />
        </>
      )}
    </CheckoutFrame>
  );
}
