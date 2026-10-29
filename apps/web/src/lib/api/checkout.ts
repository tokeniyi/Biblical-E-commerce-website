import type { CheckoutView } from "@your-app/shared";
import type { SummaryLine } from "@/components/checkout/OrderSummary";
import { ApiError } from "./client";
import { serverApi } from "./server";

/** The checkout view for a Server Component; null when the store can't be reached (E18). */
export async function loadCheckout(): Promise<CheckoutView | null> {
  try {
    return await (await serverApi()).checkout.get();
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

export function summaryLines(view: CheckoutView): SummaryLine[] {
  return view.cart.lines;
}

/** Steps after O02 need items; with none, the customer belongs on O01 (E01). */
export function hasItems(view: CheckoutView): boolean {
  return view.cart.lines.length > 0;
}
