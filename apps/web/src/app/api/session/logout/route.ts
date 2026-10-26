import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { SESSION_COOKIE, endSession } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** Ends the session only; the cart token cookie survives logout (A14). */
export const POST = mockHandler((request) => {
  endSession(getDb(), request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
});
