import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { orderConfirmation } from "@/mock-server/services/checkout";

/** O08: owner session or this browser's order session; otherwise not_found. */
export const GET = mockHandler((request, ctx, { id = "" }) => {
  const { db, token, viewer, at } = checkoutRequest(request, ctx);
  return NextResponse.json(orderConfirmation(db, id, viewer, token, at));
});
