import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { authRequest } from "@/mock-server/request";
import { PENDING_VERIFICATION_COOKIE } from "@/mock-server/services/auth";
import { register } from "@/mock-server/services/identity";

/**
 * A02 → A03. The same answer whether or not the email already has an
 * account; the address is remembered (httpOnly) so A03 can show it and resend.
 */
export const POST = mockHandler(async (request, ctx) => {
  const { db, auth } = authRequest(request, ctx);
  const result = register(db, await readBody(request), auth);
  const response = NextResponse.json(result);
  response.cookies.set(PENDING_VERIFICATION_COOKIE, encodeURIComponent(result.email), {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24,
  });
  return response;
});
