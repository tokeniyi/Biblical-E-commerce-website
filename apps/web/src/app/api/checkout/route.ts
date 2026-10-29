import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { applyQuoteDrift } from "@/mock-server/services/checkout";

/** One authoritative read for O01–O07: cart, quote, E06 changes, delivery, rates. */
export const GET = mockHandler((request, ctx) => {
  const { db, cart, view } = checkoutRequest(request, ctx);
  applyQuoteDrift(db, cart, ctx);
  return NextResponse.json(view());
});
