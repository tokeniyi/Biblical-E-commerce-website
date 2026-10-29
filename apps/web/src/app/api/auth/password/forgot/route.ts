import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { authRequest } from "@/mock-server/request";
import { forgotPassword } from "@/mock-server/services/identity";

/** A04 → A05: the same answer for registered and unregistered emails. */
export const POST = mockHandler(async (request, ctx) => {
  const { db, auth } = authRequest(request, ctx);
  return NextResponse.json(forgotPassword(db, await readBody(request), auth));
});
