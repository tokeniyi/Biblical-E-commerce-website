import { NextResponse } from "next/server";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { customerOrder } from "@/mock-server/services/account";
import { requireCustomer, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** A11 order detail: owner only; others get the same not_found as unknown ids. */
export const GET = mockHandler((request, { scenario }, params) => {
  const db = getDb();
  const session = requireCustomer(viewerOf(db, request, now(scenario)));
  return NextResponse.json({ order: customerOrder(db, session.userId, params.id) });
});
