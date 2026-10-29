// DELETE-ME-LATER: what a cart/checkout handler needs from the request.
import type { NextRequest } from "next/server";
import { now } from "./clock";
import type { ScenarioContext } from "./scenarios";
import { CART_COOKIE, viewerOf } from "./services/auth";
import { findCart } from "./services/cart";
import { checkoutView } from "./services/checkout";
import { getDb } from "./store";

export function checkoutRequest(request: NextRequest, ctx: ScenarioContext) {
  const db = getDb();
  const at = now(ctx.scenario);
  const token = request.cookies.get(CART_COOKIE)?.value;
  const cart = findCart(db, token);
  const viewer = viewerOf(db, request, at);
  return {
    db,
    at,
    token,
    cart,
    viewer,
    /** The full O01–O07 view after this request's change. */
    view: () => checkoutView(db, cart, viewer, ctx.scenario, at),
  };
}
