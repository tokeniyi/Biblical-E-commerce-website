import { NextResponse } from "next/server";
import { parseReviewsQuery } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { viewerOf } from "@/mock-server/services/auth";
import { listReviews } from "@/mock-server/services/catalog";
import { getDb } from "@/mock-server/store";

/** C06. Eligibility to write a review is derived from the viewer's orders. */
export const GET = mockHandler((request, { scenario }, { slug = "" }) => {
  const db = getDb();
  const query = parseReviewsQuery(request.nextUrl.searchParams);
  return NextResponse.json(listReviews(db, slug, query, viewerOf(db, request, now(scenario))));
});
