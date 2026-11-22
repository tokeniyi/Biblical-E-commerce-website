import { NextResponse } from "next/server";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { customerOrders } from "@/mock-server/services/account";
import { requireCustomer, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** A10 order history for the signed-in customer. */
export const GET = mockHandler((request, { scenario }) => {
  const db = getDb();
  const session = requireCustomer(viewerOf(db, request, now(scenario)));
  return NextResponse.json({ orders: customerOrders(db, session.userId) });
});
