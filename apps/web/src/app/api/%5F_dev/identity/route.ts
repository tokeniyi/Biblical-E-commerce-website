import { NextResponse } from "next/server";
import { IdentityPatchSchema } from "@/lib/api/dev-schemas";
import { isIdentityOption } from "@/lib/dev/scenario-defs";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { SESSION_COOKIE, endSession } from "@/mock-server/services/auth";
import { switchIdentity } from "@/mock-server/services/dev";
import { getDb } from "@/mock-server/store";

export const POST = mockHandler(
  async (request, { scenario }) => {
    const parsed = IdentityPatchSchema.safeParse(await readBody(request));
    if (!parsed.success || !isIdentityOption(parsed.data.identity)) {
      throw new MockApiError("validation_failed", "Unknown identity.");
    }
    const db = getDb();
    endSession(db, request.cookies.get(SESSION_COOKIE)?.value);
    const sessionId = switchIdentity(db, parsed.data.identity, now(scenario));
    const response = NextResponse.json({ ok: true });
    if (sessionId) {
      response.cookies.set(SESSION_COOKIE, sessionId, { path: "/", sameSite: "lax", httpOnly: true });
    } else {
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  },
  { dev: true },
);
