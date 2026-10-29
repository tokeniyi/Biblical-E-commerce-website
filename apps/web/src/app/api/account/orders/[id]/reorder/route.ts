import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { ensureCart, setCartCookie } from "@/mock-server/services/cart";
import { reorder } from "@/mock-server/services/orders";

/** A11 Reorder → O01: never charges; O01 shows any price or stock change (E06). */
export const POST = mockHandler((request, ctx, { id = "" }) => {
  const { db, user, scenario } = accountRequest(request, ctx);
  const cart = ensureCart(db, request.cookies.get(CART_COOKIE)?.value);
  cart.customerId ??= user.id;
  const response = NextResponse.json(reorder(db, user.id, id, cart, scenario));
  setCartCookie(response, cart.token);
  return response;
});
