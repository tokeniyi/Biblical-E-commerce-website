import { NextResponse } from "next/server";
import { LoginInputSchema } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { signIn } from "@/mock-server/services/account";
import { SESSION_COOKIE, endSession } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** A01 / B01 sign-in. The cart token cookie is untouched, so the cart survives sign-in. */
export const POST = mockHandler(async (request, { scenario }) => {
  const parsed = LoginInputSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Check the highlighted fields.", fieldErrors(parsed.error.issues));
  }
  const db = getDb();
  endSession(db, request.cookies.get(SESSION_COOKIE)?.value);
  const { user, sessionId } = signIn(db, parsed.data, now(scenario));
  const response = NextResponse.json({ ok: true, kind: user.kind });
  response.cookies.set(SESSION_COOKIE, sessionId, { path: "/", sameSite: "lax", httpOnly: true });
  return response;
});

