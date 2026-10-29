import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { accountOverview } from "@/mock-server/services/account";

/** A07 cards: counts from the same data the account pages read. */
export const GET = mockHandler((request, ctx) => {
  const { db, user, scenario } = accountRequest(request, ctx);
  return NextResponse.json(accountOverview(db, user, scenario));
});
