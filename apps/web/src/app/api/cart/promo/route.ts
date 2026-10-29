import { NextResponse } from "next/server";
import { PromoInputSchema } from "@your-app/shared";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { applyPromo, removePromo } from "@/mock-server/services/checkout";

/** O01 promo Apply. Refusals (E08) leave the cart and totals unchanged. */
export const POST = mockHandler(async (request, ctx) => {
  const parsed = PromoInputSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Enter a promo code.", { code: ["Enter a promo code."] });
  }
  const { db, cart, at, view } = checkoutRequest(request, ctx);
  if (!cart) throw new MockApiError("validation_failed", "Your cart is empty.");
  applyPromo(db, cart, parsed.data.code, at, ctx.scenario.promo);
  return NextResponse.json(view());
});

export const DELETE = mockHandler((request, ctx) => {
  const { cart, view } = checkoutRequest(request, ctx);
  if (cart) removePromo(cart);
  return NextResponse.json(view());
});
