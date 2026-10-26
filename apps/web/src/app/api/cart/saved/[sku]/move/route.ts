import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { moveSavedToCart } from "@/mock-server/services/cart";
import { getDb } from "@/mock-server/store";

/** C08 "Move to cart": rechecks stock and price; on failure the item stays saved (E05). */
export const POST = mockHandler((request, _ctx, { sku = "" }) =>
  NextResponse.json(moveSavedToCart(getDb(), request.cookies.get(CART_COOKIE)?.value, sku)),
);
