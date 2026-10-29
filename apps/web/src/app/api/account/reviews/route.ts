import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { myReviews } from "@/mock-server/services/reviews";

export const GET = mockHandler((request, ctx) => {
  const { db, user, scenario } = accountRequest(request, ctx);
  return NextResponse.json(myReviews(db, user.id, scenario));
});
