import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { submitPayment } from "@/mock-server/services/checkout";

/** O05 Pay: final quote check, then an idempotent payment intent. */
export const POST = mockHandler(async (request, ctx) => {
  const body = await readBody(request);
  const { db, cart, viewer, at } = checkoutRequest(request, ctx);
  return NextResponse.json(submitPayment(db, cart, body, viewer, ctx.scenario, at));
});
