import { NextResponse } from "next/server";
import { isIdentityOption } from "@/lib/dev/scenario-defs";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler } from "@/mock-server/http";
import { SESSION_COOKIE, endSession, expireSession, setSessionCookie } from "@/mock-server/services/auth";
import { switchIdentity } from "@/mock-server/services/dev";
import { sendResetLink } from "@/mock-server/services/identity";
import { getDb } from "@/mock-server/store";
import type { CustomerRecord } from "@/mock-server/types";

const PREPS = ["expire", "reset-link"] as const;

/**
 * Screen presets for /__dev/screens and /__dev/states, as plain HTML form
 * posts: `?identity=customer` signs in as that toolbar identity,
 * `&prep=expire` then expires the session (E11), `&prep=reset-link` opens a
 * fresh A06 link for Jordan. Answers with a redirect to `next`.
 */
export const POST = mockHandler(
  (request, { scenario }) => {
    const db = getDb();
    const at = now(scenario);
    const params = request.nextUrl.searchParams;
    const identity = params.get("identity");
    const prep = PREPS.find((p) => p === params.get("prep"));
    let next = params.get("next") ?? "/";
    let sessionId: string | null | undefined;

    if (identity !== null) {
      if (!isIdentityOption(identity)) throw new MockApiError("validation_failed", "Unknown identity.");
      endSession(db, request.cookies.get(SESSION_COOKIE)?.value);
      sessionId = switchIdentity(db, identity, at);
      if (prep === "expire") expireSession(db, sessionId ?? undefined, at);
    }
    if (prep === "reset-link") {
      const jordan = db.users.find((u): u is CustomerRecord => u.id === "cus_jordan" && u.kind === "customer");
      if (jordan) next = sendResetLink(db, jordan, at);
    }

    // Same-origin relative paths only ("//host" and "/\host" leave the site).
    if (!/^\/(?![/\\])/.test(next)) next = "/";
    const response = NextResponse.redirect(new URL(next, request.nextUrl.origin), 303);
    if (sessionId) setSessionCookie(response, sessionId, false);
    else if (sessionId === null) response.cookies.delete(SESSION_COOKIE);
    return response;
  },
  { dev: true },
);
