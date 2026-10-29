import { formatCents, type Quote } from "@your-app/shared";
import { panel } from "@/components/ui/styles";

export type SummaryLine = { sku: string; productName: string; quantity: number; lineTotalCents: number };

type OrderSummaryProps = {
  lines: readonly SummaryLine[];
  totals: Omit<Quote, "lines">;
  /** "Order summary" until paid; O08 says "Paid order summary". */
  title?: string;
  /** Footnote under the total; defaults to the O01–O07 currency/promo note. */
  note?: string;
};

export function summaryNote(promoCode: string | null): string {
  return `USD · Tax finalized after address; ${promoCode ? `promo ${promoCode} applied` : "no promo applied"}.`;
}

/** The repeated order summary panel from O01–O08 (spec §4): built once. */
export function OrderSummary({ lines, totals, title = "Order summary", note }: OrderSummaryProps) {
  const rows: [string, number][] = [
    ["Subtotal", totals.subtotalCents],
    ["Shipping", totals.shippingCents],
    ["Tax", totals.taxCents],
    ["Discount", totals.discountCents],
  ];
  return (
    <section aria-labelledby="order-summary-title" className={panel}>
      <h2 id="order-summary-title" className="text-base font-semibold">
        {title}
      </h2>
      <ul className="text-sm leading-snug">
        {lines.map((l) => (
          <li key={l.sku} className="flex justify-between gap-3">
            <span>
              {l.productName} × {l.quantity}
            </span>
            <span>{formatCents(l.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <dl className="text-sm leading-snug">
        {rows.map(([label, cents]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt>{label}</dt>
            <dd>{cents < 0 ? `−${formatCents(-cents)}` : formatCents(cents)}</dd>
          </div>
        ))}
      </dl>
      <p className="flex justify-between gap-3 text-base font-semibold" data-testid="summary-total">
        <span>Total</span>
        <span>{formatCents(totals.totalCents)}</span>
      </p>
      <p className="text-sm text-muted">{note ?? summaryNote(totals.promoCode)}</p>
    </section>
  );
}
