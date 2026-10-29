import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { acceptChanges } from "@/mock-server/services/checkout";

/** E06 "Accept & update": take the server's stock and prices. */
export const POST = mockHandler((request, ctx) => {
  const { db, cart, view } = checkoutRequest(request, ctx);
  if (cart) acceptChanges(db, cart);
  return NextResponse.json(view());
});
