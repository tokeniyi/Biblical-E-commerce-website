import { NextResponse } from "next/server";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { removeFromWishlist, wishlistItems } from "@/mock-server/services/account";
import { requireCustomer, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** Remove one edition from the wishlist (idempotent). */
export const DELETE = mockHandler((request, { scenario }, params) => {
  const db = getDb();
  const session = requireCustomer(viewerOf(db, request, now(scenario)));
  removeFromWishlist(db, session.userId, params.sku);
  return NextResponse.json({ items: wishlistItems(db, session.userId) });
});
