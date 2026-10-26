import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { cartView, findCart } from "@/mock-server/services/cart";
import { getDb } from "@/mock-server/store";

/**
 * The anonymous cart behind the cart cookie. Read as page chrome (like the
 * header count), so "fail next read" lands on the page's main data instead.
 */
export const GET = mockHandler(
  (request) => {
    const db = getDb();
    return NextResponse.json(cartView(db, findCart(db, request.cookies.get(CART_COOKIE)?.value)));
  },
  { chrome: true },
);
