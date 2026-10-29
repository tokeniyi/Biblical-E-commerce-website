import { NextResponse } from "next/server";
import { UpdateLineInputSchema } from "@your-app/shared";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { removeLine, updateLineQuantity } from "@/mock-server/services/cart";

/** O01 quantity stepper: min 1, max available; 0 is refused (Remove is explicit). */
export const PATCH = mockHandler(async (request, ctx, { sku = "" }) => {
  const parsed = UpdateLineInputSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    const message = "Quantity must be at least 1. Use Remove to take it out of your cart.";
    throw new MockApiError("validation_failed", message, { quantity: [message] });
  }
  const { db, token, view } = checkoutRequest(request, ctx);
  updateLineQuantity(db, token, sku, parsed.data.quantity);
  return NextResponse.json(view());
});

/** O01 confirmed Remove, and E06 "Remove affected item". */
export const DELETE = mockHandler((request, ctx, { sku = "" }) => {
  const { db, token, view } = checkoutRequest(request, ctx);
  removeLine(db, token, sku);
  return NextResponse.json(view());
});
