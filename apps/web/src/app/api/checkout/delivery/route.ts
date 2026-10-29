import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { saveDelivery } from "@/mock-server/services/checkout";

/** O03 Continue: validates (E07) and checks coverage (E14). */
export const POST = mockHandler(async (request, ctx) => {
  const body = await readBody(request);
  const { db, cart, viewer, view } = checkoutRequest(request, ctx);
  saveDelivery(db, cart, body, viewer, ctx.scenario);
  return NextResponse.json(view());
});
