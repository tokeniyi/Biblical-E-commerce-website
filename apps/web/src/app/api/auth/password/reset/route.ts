import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { authRequest } from "@/mock-server/request";
import { SESSION_COOKIE } from "@/mock-server/services/auth";
import { checkResetToken, resetPassword } from "@/mock-server/services/identity";

/** A06: the page asks first, so the form is only enabled for a valid link (E10 otherwise). */
export const GET = mockHandler((request, ctx) => {
  const { db, auth } = authRequest(request, ctx);
  checkResetToken(db, request.nextUrl.searchParams.get("token") ?? "", auth);
  return NextResponse.json({ valid: true });
});

/** A06 submit: single use; every session of the account ends, this browser's too (→ A01). */
export const POST = mockHandler(async (request, ctx) => {
  const { db, auth } = authRequest(request, ctx);
  resetPassword(db, await readBody(request), auth);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
});
