import { NextResponse } from "next/server";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { SESSION_COOKIE, expireSession } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** Keeps the cookie but expires the session, so the next guarded call hits E11. */
export const POST = mockHandler(
  (request, { scenario }) => {
    expireSession(getDb(), request.cookies.get(SESSION_COOKIE)?.value, now(scenario));
    return NextResponse.json({ ok: true });
  },
  { dev: true },
);
