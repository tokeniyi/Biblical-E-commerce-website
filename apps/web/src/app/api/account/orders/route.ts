import { NextResponse } from "next/server";
import { parseAccountOrdersQuery } from "@your-app/shared";
import { mockHandler } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { listCustomerOrders } from "@/mock-server/services/orders";

/** A10: this customer's orders only; filters and page come from the URL. */
export const GET = mockHandler((request, ctx) => {
  const { db, user, scenario } = accountRequest(request, ctx);
  const query = parseAccountOrdersQuery(request.nextUrl.searchParams);
  return NextResponse.json(listCustomerOrders(db, user.id, query, scenario));
});
