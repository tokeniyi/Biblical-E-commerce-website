import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { loadSampleCart, setCartCookie } from "@/mock-server/services/cart";
import { getDb } from "@/mock-server/store";

/**
 * Loads the cart drawn in C07/C08 for this browser. `?next=/cart/saved`
 * answers with a redirect, so a plain HTML form on /__dev/screens can use it.
 */
export const POST = mockHandler(
  (request) => {
    const cart = loadSampleCart(getDb(), request.cookies.get(CART_COOKIE)?.value);
    const next = request.nextUrl.searchParams.get("next");
    // Same-origin relative paths only ("//host" and "/\host" leave the site).
    const response =
      next && /^\/(?![/\\])/.test(next)
        ? NextResponse.redirect(new URL(next, request.nextUrl.origin), 303)
        : NextResponse.json({ ok: true });
    setCartCookie(response, cart.token);
    return response;
  },
  { dev: true },
);
