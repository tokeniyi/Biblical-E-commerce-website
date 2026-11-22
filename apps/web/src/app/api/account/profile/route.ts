import { NextResponse } from "next/server";
import type { AccountProfile } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler } from "@/mock-server/http";
import { requireCustomer, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** Profile, address book and own reviews for the account area. */
export const GET = mockHandler((request, { scenario }) => {
  const db = getDb();
  const session = requireCustomer(viewerOf(db, request, now(scenario)));
  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.kind !== "customer") throw new MockApiError("unauthenticated", "Sign in to continue.");
  const body: AccountProfile = {
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    marketingOptIn: user.marketingOptIn,
    addresses: user.addresses,
    reviews: db.reviews
      .filter((r) => r.customerId === user.id)
      .map((r) => ({ id: r.id, productSlug: r.productSlug, rating: r.rating, title: r.title, status: r.status, createdAt: r.createdAt })),
  };
  return NextResponse.json(body);
});
