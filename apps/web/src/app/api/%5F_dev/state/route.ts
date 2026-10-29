import { NextResponse } from "next/server";
import type { DevState } from "@/lib/api/dev-schemas";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { SESSION_COOKIE, lookupSession } from "@/mock-server/services/auth";
import { identityOfUser } from "@/mock-server/services/dev";
import { getDb } from "@/mock-server/store";

export const GET = mockHandler(
  (request, { scenario }) => {
    const db = getDb();
    const at = now(scenario);
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    const lookup = lookupSession(db, sessionId, at);
    const record = db.sessions.find((s) => s.id === sessionId);
    const body: DevState = {
      // An expired session still shows who it belonged to, so testers can see it.
      identity: identityOfUser(record?.userId ?? null),
      sessionExpired: lookup.status === "expired",
      scenario,
      now: at.toISOString(),
      outboxCount: db.outbox.length,
      pendingReviews: db.reviews.filter((r) => r.status === "pending").length,
      orderCount: db.orders.length,
      paymentIntentCount: db.paymentIntents.length,
    };
    return NextResponse.json(body);
  },
  { dev: true },
);
