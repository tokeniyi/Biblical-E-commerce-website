import { NextResponse } from "next/server";
import type { SessionResponse } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE, SESSION_COOKIE, lookupSession, publicSession } from "@/mock-server/services/auth";
import { cartCount } from "@/mock-server/services/dev";
import { getDb } from "@/mock-server/store";

/** Header chrome on every page, so it is exempt from injected latency/faults. */
export const GET = mockHandler(
  (request, { scenario }) => {
    const db = getDb();
    const lookup = lookupSession(db, request.cookies.get(SESSION_COOKIE)?.value, now(scenario));
    const body: SessionResponse = {
      ...publicSession(lookup),
      cartCount: cartCount(db, request.cookies.get(CART_COOKIE)?.value),
    };
    return NextResponse.json(body);
  },
  { chrome: true },
);
