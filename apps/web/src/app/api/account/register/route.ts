import { NextResponse } from "next/server";
import { RegisterInputSchema } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { register } from "@/mock-server/services/account";
import { SESSION_COOKIE, endSession } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** A02 create account: signs the new customer in and sends the verification email (Dev Inbox). */
export const POST = mockHandler(async (request, { scenario }) => {
  const parsed = RegisterInputSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (errors[String(issue.path[0] ?? "form")] ??= []).push(issue.message);
    throw new MockApiError("validation_failed", "Check the highlighted fields.", errors);
  }
  const db = getDb();
  endSession(db, request.cookies.get(SESSION_COOKIE)?.value);
  const { sessionId } = register(db, parsed.data, now(scenario));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionId, { path: "/", sameSite: "lax", httpOnly: true });
  return response;
});
