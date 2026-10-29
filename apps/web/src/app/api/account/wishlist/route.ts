import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { wishlistItems } from "@/mock-server/services/account";

/** A12: saved editions with current price and stock. */
export const GET = mockHandler((request, ctx) => {
  const { db, user } = accountRequest(request, ctx);
  return NextResponse.json(wishlistItems(db, user.id));
});
