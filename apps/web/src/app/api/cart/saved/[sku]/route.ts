import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { removeSaved } from "@/mock-server/services/cart";
import { getDb } from "@/mock-server/store";

/** C08 "Remove" (after the confirm dialog). Never touches cart lines. */
export const DELETE = mockHandler((request, _ctx, { sku = "" }) =>
  NextResponse.json(removeSaved(getDb(), request.cookies.get(CART_COOKIE)?.value, sku)),
);
