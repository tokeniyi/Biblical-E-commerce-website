import { formatCents, type AddressInput, type CheckoutView } from "@your-app/shared";
import { panel } from "@/components/ui/styles";

export function oneLineAddress(a: AddressInput): string {
  return `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.state} ${a.zip}, ${a.country}`;
}

/** The "Delivery" panel (O04, O08): who, where, and the chosen method. */
export function DeliveryPanel({
  name,
  email,
  address,
  method,
}: {
  name: string;
  email: string;
  address: AddressInput;
  method: string | null;
}) {
  return (
    <section aria-labelledby="delivery-panel-title" className={panel}>
      <h2 id="delivery-panel-title" className="text-base font-semibold">
        Delivery
      </h2>
      <div className="text-sm leading-snug">
        <p>
          {name} · {email}
        </p>
        <p>{oneLineAddress(address)}</p>
        {method ? <p>{method}</p> : null}
      </div>
    </section>
  );
}

/** "Standard · $5.00 · Estimated 12–14 Oct 2026" for the chosen method. */
export function chosenMethodLine(view: CheckoutView): string | null {
  const option = view.shippingOptions.find((o) => o.id === (view.quote.shippingMethod ?? "standard"));
  return option
    ? `${option.label} · ${formatCents(option.priceCents)} · Estimated ${option.estimate} ${String(option.estimateYear)}`
    : null;
}
