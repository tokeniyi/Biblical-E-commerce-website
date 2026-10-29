import { NextResponse } from "next/server";
import type { VerificationStatus } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { PENDING_VERIFICATION_COOKIE, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** A03 pending: whose address is waiting (signed-in customer first, then this browser's sign-up). */
export const GET = mockHandler((request, { scenario }) => {
  const db = getDb();
  const viewer = viewerOf(db, request, now(scenario));
  let body: VerificationStatus = { email: null, verified: false };
  if (viewer.status === "active" && viewer.session.kind === "customer") {
    body = { email: viewer.session.email, verified: viewer.session.emailVerified };
  } else {
    const raw = request.cookies.get(PENDING_VERIFICATION_COOKIE)?.value;
    const email = raw ? decodeURIComponent(raw) : null;
    if (email && /^[^@\s]+@[^@\s]+$/.test(email)) body = { email, verified: false };
  }
  return NextResponse.json(body);
});
