import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { customerOrderDetail } from "@/mock-server/services/orders";

/** A11: someone else's order and a missing one are the same not_found. */
export const GET = mockHandler((request, ctx, { id = "" }) => {
  const { db, at, user, scenario } = accountRequest(request, ctx);
  return NextResponse.json(customerOrderDetail(db, user.id, id, scenario, at));
});
