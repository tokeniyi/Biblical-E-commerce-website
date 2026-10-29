import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { reviewForm, submitReview } from "@/mock-server/services/reviews";

/** A13 write/edit: eligibility from the customer's own delivered order. */
export const GET = mockHandler((request, ctx, { id = "", sku = "" }) => {
  const { db, user, scenario } = accountRequest(request, ctx);
  return NextResponse.json(reviewForm(db, user.id, id, sku, scenario));
});

/** Submit or edit: rechecked here; the review is pending until moderated. */
export const PUT = mockHandler(async (request, ctx, { id = "", sku = "" }) => {
  const { db, at, user, scenario } = accountRequest(request, ctx);
  submitReview(db, user, id, sku, await readBody(request), scenario, at);
  return NextResponse.json(reviewForm(db, user.id, id, sku, scenario));
});
