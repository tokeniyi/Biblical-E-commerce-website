import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { readIntent } from "@/mock-server/services/checkout";

/** O06 status. Only the browser that paid can read it. */
export const GET = mockHandler((request, ctx, { id = "" }) => {
  const { db, token, at } = checkoutRequest(request, ctx);
  return NextResponse.json(readIntent(db, id, token, at));
});
