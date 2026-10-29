import { NextResponse } from "next/server";
import { MergeChoiceInputSchema } from "@your-app/shared";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { resolveMergeConflict } from "@/mock-server/services/cart";

/** O01 sign-in merge prompt: keep this visit's quantity or use the account cart's. */
export const POST = mockHandler(async (request, ctx) => {
  const parsed = MergeChoiceInputSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new MockApiError("validation_failed", "Choose a quantity.");
  const { db, token, view } = checkoutRequest(request, ctx);
  resolveMergeConflict(db, token, parsed.data.sku, parsed.data.use);
  return NextResponse.json(view());
});
