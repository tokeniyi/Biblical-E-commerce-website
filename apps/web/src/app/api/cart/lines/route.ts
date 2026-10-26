import { NextResponse } from "next/server";
import { AddToCartInputSchema } from "@your-app/shared";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { addToCart, ensureCart, setCartCookie } from "@/mock-server/services/cart";
import { getDb } from "@/mock-server/store";

/** C05 "Add to cart". Creates the anonymous cart on first add. */
export const POST = mockHandler(async (request) => {
  const parsed = AddToCartInputSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Choose a quantity of at least 1.", {
      quantity: ["Choose a quantity of at least 1."],
    });
  }
  const db = getDb();
  const cart = ensureCart(db, request.cookies.get(CART_COOKIE)?.value);
  const response = NextResponse.json(addToCart(db, cart, parsed.data));
  setCartCookie(response, cart.token);
  return response;
});
