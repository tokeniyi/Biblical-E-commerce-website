import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { removeFromWishlist } from "@/mock-server/services/account";

/** A12 "Remove from wishlist", after the confirmation. */
export const DELETE = mockHandler((request, ctx, { sku = "" }) => {
  const { db, user } = accountRequest(request, ctx);
  return NextResponse.json(removeFromWishlist(db, user.id, sku));
});
