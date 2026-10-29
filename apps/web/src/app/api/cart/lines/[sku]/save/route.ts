import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { saveLineForLater } from "@/mock-server/services/cart";

/** O01 "Save → C08": out of the totals, into saved for later. */
export const POST = mockHandler((request, ctx, { sku = "" }) => {
  const { db, token, view } = checkoutRequest(request, ctx);
  saveLineForLater(db, token, sku);
  return NextResponse.json(view());
});
