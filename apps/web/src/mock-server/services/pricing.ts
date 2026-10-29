// DELETE-ME-LATER: quote math (spec §2, §5.2) as pure functions, so the
// real API can port them with their tests.
import { SHIPPING_METHODS, taxOnCents, type Discount, type Quote, type ShippingMethodId } from "@your-app/shared";

export type PricedLine = {
  sku: string;
  quantity: number;
  unitPriceCents: number;
  /** Product categories, for category-scoped discounts. */
  categorySlugs: readonly string[];
};

/** Goods a discount may apply to: every line, or only its categories. */
export function eligibleGoodsCents(discount: Pick<Discount, "eligibleCategorySlugs">, lines: readonly PricedLine[]): number {
  const scoped = discount.eligibleCategorySlugs;
  return lines
    .filter((l) => scoped.length === 0 || l.categorySlugs.some((c) => scoped.includes(c)))
    .reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

/**
 * Discount on goods only, never shipping. Percent rounds to the cent; fixed
 * is capped at the eligible goods (spec §2).
 */
export function discountCents(
  discount: Pick<Discount, "kind" | "value" | "eligibleCategorySlugs">,
  lines: readonly PricedLine[],
): number {
  const eligible = eligibleGoodsCents(discount, lines);
  return discount.kind === "percent"
    ? Math.round((eligible * discount.value) / 100)
    : Math.min(discount.value, eligible);
}

/**
 * Subtotal + shipping + tax − discount. Before a method is chosen the
 * quote shows Standard as the estimate (O01 "Shipping $5.00"); an empty
 * cart ships nothing. Tax is 8% of goods after the discount.
 */
export function computeQuote(input: {
  lines: readonly PricedLine[];
  shippingMethod: ShippingMethodId | null;
  discount: Discount | null;
}): Quote {
  const lines = input.lines.map((l) => ({
    sku: l.sku,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    lineTotalCents: l.unitPriceCents * l.quantity,
  }));
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const discount = input.discount ? discountCents(input.discount, input.lines) : 0;
  const shippingCents = lines.length === 0 ? 0 : SHIPPING_METHODS[input.shippingMethod ?? "standard"].priceCents;
  const taxCents = taxOnCents(subtotalCents - discount);
  return {
    lines,
    subtotalCents,
    shippingCents,
    taxCents,
    discountCents: discount === 0 ? 0 : -discount,
    totalCents: subtotalCents - discount + shippingCents + taxCents,
    shippingMethod: input.shippingMethod,
    promoCode: input.discount && discount > 0 ? input.discount.code : null,
  };
}
