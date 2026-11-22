import { NextResponse } from "next/server";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { wishlistItems } from "@/mock-server/services/account";
import { requireCustomer, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** A12 wishlist with product details. */
export const GET = mockHandler((request, { scenario }) => {
  const db = getDb();
  const session = requireCustomer(viewerOf(db, request, now(scenario)));
  return NextResponse.json({ items: wishlistItems(db, session.userId) });
});
