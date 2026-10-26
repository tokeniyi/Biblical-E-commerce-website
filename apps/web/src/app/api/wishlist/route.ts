import { NextResponse } from "next/server";
import { WishlistAddInputSchema } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { requireCustomer, viewerOf } from "@/mock-server/services/auth";
import { addToWishlist, getWishlist } from "@/mock-server/services/wishlist";
import { getDb } from "@/mock-server/store";

/** Saved/not-saved state for ♡ buttons. Chrome, like the header: exempt from injected faults. */
export const GET = mockHandler(
  (request, { scenario }) => {
    const db = getDb();
    const session = requireCustomer(viewerOf(db, request, now(scenario)));
    return NextResponse.json(getWishlist(db, session.userId));
  },
  { chrome: true },
);

/** ♡ Save (C01/C03/C05). Signed out → unauthenticated (A01); expired → session_expired (E11/A14). */
export const POST = mockHandler(async (request, { scenario }) => {
  const db = getDb();
  const session = requireCustomer(viewerOf(db, request, now(scenario)));
  const parsed = WishlistAddInputSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new MockApiError("validation_failed", "Choose an edition to save.");
  return NextResponse.json(addToWishlist(db, session.userId, parsed.data.sku));
});
