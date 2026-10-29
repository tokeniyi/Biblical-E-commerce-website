import { NextResponse } from "next/server";
import { ShippingInputSchema } from "@your-app/shared";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { chooseShipping } from "@/mock-server/services/checkout";

/** O04: selecting a method recalculates the total. */
export const POST = mockHandler(async (request, ctx) => {
  const parsed = ShippingInputSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new MockApiError("validation_failed", "Choose a delivery method.");
  const { db, cart, view } = checkoutRequest(request, ctx);
  chooseShipping(db, cart, parsed.data.method, ctx.scenario);
  return NextResponse.json(view());
});
