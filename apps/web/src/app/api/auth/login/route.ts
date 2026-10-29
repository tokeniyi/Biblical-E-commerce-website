import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { authRequest } from "@/mock-server/request";
import { setSessionCookie } from "@/mock-server/services/auth";
import { setCartCookie } from "@/mock-server/services/cart";
import { login } from "@/mock-server/services/identity";

/**
 * A01. Wrong password, unknown email and staff accounts all answer E09
 * (invalid_credentials). On success the browser's cart joins the account
 * cart, and a ♡ tap carried through sign-in is saved.
 */
export const POST = mockHandler(async (request, ctx) => {
  const { db, auth } = authRequest(request, ctx);
  const outcome = login(db, await readBody(request), auth);
  const response = NextResponse.json(outcome.result);
  setSessionCookie(response, outcome.sessionId, outcome.persistent);
  if (outcome.cartToken) setCartCookie(response, outcome.cartToken);
  return response;
});
