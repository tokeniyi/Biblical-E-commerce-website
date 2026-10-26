// DELETE-ME-LATER: mock sessions behind a getSession() shape that matches
// the planned Auth.js JWT claims (docs/ARCHITECTURE.md §3.1).
import type { Session } from "@your-app/shared";
import { addMinutes } from "../clock";
import { MockApiError } from "../http";
import { nextId } from "../store";
import type { Db, UserRecord } from "../types";

export const SESSION_COOKIE = "mock_session";
export const CART_COOKIE = "cart_token";

/** Customer and staff sessions both last 2 hours in the mock. */
export const SESSION_TTL_MINUTES = 120;

export type SessionLookup =
  | { status: "none" }
  | { status: "expired" }
  | { status: "active"; session: Exclude<Session, { kind: "anonymous" }> };

export function createSession(db: Db, user: UserRecord, at: Date): string {
  const id = nextId(db, "ses");
  db.sessions.push({ id, userId: user.id, expiresAt: addMinutes(at, SESSION_TTL_MINUTES).toISOString() });
  return id;
}

export function endSession(db: Db, sessionId: string | undefined): void {
  if (!sessionId) return;
  db.sessions = db.sessions.filter((s) => s.id !== sessionId);
}

/** Dev toolbar "Session: expire now" (E11 / A14). */
export function expireSession(db: Db, sessionId: string | undefined, at: Date): void {
  const record = db.sessions.find((s) => s.id === sessionId);
  if (record) record.expiresAt = new Date(at.getTime() - 1000).toISOString();
}

export function lookupSession(db: Db, sessionId: string | undefined, at: Date): SessionLookup {
  const record = db.sessions.find((s) => s.id === sessionId);
  if (!record) return { status: "none" };
  if (Date.parse(record.expiresAt) <= at.getTime()) return { status: "expired" };
  const user = db.users.find((u) => u.id === record.userId);
  if (!user) return { status: "none" };
  const common = { userId: user.id, email: user.email, name: user.name, expiresAt: record.expiresAt };
  return user.kind === "customer"
    ? { status: "active", session: { kind: "customer", ...common, emailVerified: user.emailVerified } }
    : { status: "active", session: { kind: "staff", ...common, role: user.role } };
}

/** Public session view: expired sessions read as anonymous plus a flag. */
export function publicSession(lookup: SessionLookup): { session: Session; expired: boolean } {
  return lookup.status === "active"
    ? { session: lookup.session, expired: false }
    : { session: { kind: "anonymous" }, expired: lookup.status === "expired" };
}

/** For guarded mutations: distinguishes A14 signed-out from E11 expired. */
export function requireSession(lookup: SessionLookup) {
  if (lookup.status === "expired") throw new MockApiError("session_expired", "Your session has expired.");
  if (lookup.status === "none") throw new MockApiError("unauthenticated", "Sign in to continue.");
  return lookup.session;
}
