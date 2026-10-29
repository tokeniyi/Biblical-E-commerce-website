import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { checkoutRequest } from "@/mock-server/request";
import { checkIntent } from "@/mock-server/services/checkout";

/** E15 "Check status": looks up the existing intent; never creates another. */
export const POST = mockHandler((request, ctx, { id = "" }) => {
  const { db, token, at } = checkoutRequest(request, ctx);
  return NextResponse.json(checkIntent(db, id, token, at));
});
