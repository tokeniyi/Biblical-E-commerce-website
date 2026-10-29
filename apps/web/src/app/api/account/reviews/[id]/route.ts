import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { deleteReview, myReviews } from "@/mock-server/services/reviews";

/** A13 delete, after the confirmation; only the author's own review. */
export const DELETE = mockHandler((request, ctx, { id = "" }) => {
  const { db, user, scenario } = accountRequest(request, ctx);
  deleteReview(db, user.id, id);
  return NextResponse.json(myReviews(db, user.id, scenario));
});
