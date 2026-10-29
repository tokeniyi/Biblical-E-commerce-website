import { NextResponse } from "next/server";
import { VerifyEmailInputSchema } from "@your-app/shared";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { authRequest } from "@/mock-server/request";
import { PENDING_VERIFICATION_COOKIE, setSessionCookie } from "@/mock-server/services/auth";
import { setCartCookie } from "@/mock-server/services/cart";
import { verifyEmail } from "@/mock-server/services/identity";

/** A03 link: single use. Verifies, signs in, and answers where to continue. */
export const POST = mockHandler(async (request, ctx) => {
  const parsed = VerifyEmailInputSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new MockApiError("token_expired", "This link is no longer valid.");
  const { db, auth } = authRequest(request, ctx);
  const outcome = verifyEmail(db, parsed.data.token, auth);
  const response = NextResponse.json(outcome.verified);
  setSessionCookie(response, outcome.sessionId, false);
  if (outcome.cartToken) setCartCookie(response, outcome.cartToken);
  response.cookies.delete(PENDING_VERIFICATION_COOKIE);
  return response;
});
