// DELETE-ME-LATER: mock sessions behind a getSession() shape that matches
// the planned Auth.js JWT claims (docs/ARCHITECTURE.md §3.1).
import type { Session } from "@your-app/shared";
import { addMinutes } from "../clock";
import { MockApiError } from "../http";
import type { Db, UserRecord } from "../types";

export const SESSION_COOKIE = "mock_session";
export const CART_COOKIE = "cart_token";
/** A02 → A03: the address waiting for verification in this browser (httpOnly). */
export const PENDING_VERIFICATION_COOKIE = "pending_verification";

/** Customer and staff sessions both last 2 hours in the mock. */
export const SESSION_TTL_MINUTES = 120;

/** "Keep me signed in on this device" (A01). */
export const PERSISTENT_SESSION_DAYS = 30;

export type SessionLookup =
  | { status: "none" }
  | { status: "expired" }
  | { status: "active"; session: Exclude<Session, { kind: "anonymous" }> };

export function createSession(db: Db, user: UserRecord, at: Date, persistent = false): string {
  // Unguessable, unlike the sequential ids used for records.
  const id = `ses_${crypto.randomUUID()}`;
  const ttl = persistent ? PERSISTENT_SESSION_DAYS * 24 * 60 : SESSION_TTL_MINUTES;
  db.sessions.push({ id, userId: user.id, expiresAt: addMinutes(at, ttl).toISOString(), persistent });
  return id;
}

/** A06: a password change signs the account out everywhere. */
export function endUserSessions(db: Db, userId: string): void {
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
}

type CookieWriter = { cookies: { set: (name: string, value: string, options: object) => unknown } };

/** httpOnly session cookie; a browser-session cookie unless "keep me signed in" was ticked. */
export function setSessionCookie(response: CookieWriter, sessionId: string, persistent: boolean): void {
  response.cookies.set(SESSION_COOKIE, sessionId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    ...(persistent ? { maxAge: PERSISTENT_SESSION_DAYS * 24 * 60 * 60 } : {}),
  });
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

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };

/** The session behind this request's cookie, at the mock clock's "now". */
export function viewerOf(db: Db, request: CookieReader, at: Date): SessionLookup {
  return lookupSession(db, request.cookies.get(SESSION_COOKIE)?.value, at);
}

/** Customer-only actions (wishlist, reviews): staff sessions are not customers. */
export function requireCustomer(lookup: SessionLookup) {
  const session = requireSession(lookup);
  if (session.kind !== "customer") throw new MockApiError("unauthenticated", "Sign in with a customer account.");
  return session;
}
