import { NextResponse } from "next/server";
import { InsightsQuerySchema } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler } from "@/mock-server/http";
import { buildInsights } from "@/mock-server/services/analytics";
import { requireStaff, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** UX insights report: staff only (every role may read it; none may change it). */
export const GET = mockHandler((request, { scenario }) => {
  const db = getDb();
  requireStaff(viewerOf(db, request, now(scenario)));
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = InsightsQuerySchema.safeParse(params);
  if (!parsed.success) throw new MockApiError("validation_failed", "Invalid report range.");
  return NextResponse.json(buildInsights(db.analyticsEvents, parsed.data, Date.now()));
});
