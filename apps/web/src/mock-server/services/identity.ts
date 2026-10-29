// DELETE-ME-LATER: customer sign-in, sign-up, email verification and
// password reset (A01–A06). Responses are generic wherever Figma asks:
// nothing here tells a visitor whether an email has an account.
import {
  ForgotPasswordInputSchema,
  LoginInputSchema,
  RESEND_COOLDOWN_SECONDS,
  RESET_LINK_TTL_MINUTES,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  safeReturnTo,
  type AuthResult,
  type CooldownResult,
  type PendingSaveResult,
  type VerifyEmailResult,
} from "@your-app/shared";
import type { Scenario } from "@/lib/dev/scenario-defs";
import { addMinutes } from "../clock";
import { MockApiError } from "../http";
import { sendEmail } from "../outbox";
import type { AuthTokenRecord, CustomerRecord, Db } from "../types";
import { createSession, endUserSessions } from "./auth";
import { mergeCartOnSignIn } from "./cart";
import { addToWishlist } from "./wishlist";

/** Verification links are "short-lived" in Figma A03; the duration is ours to pick. */
export const VERIFY_LINK_TTL_MINUTES = 24 * 60;
/** Failed sign-ins allowed per email in the window before E09 turns into a lockout. */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;

/** Request context: the mock clock for tokens, real time for rate limits. */
export type AuthContext = {
  at: Date;
  /** Date.now(): cooldowns must pass even while the mock clock is frozen. */
  wallMs: number;
  scenario: Pick<Scenario, "tokens">;
  cartToken: string | undefined;
};

export function zodFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages?.length) out[key] = messages;
  }
  return out;
}

function invalid(fieldErrors: Record<string, string[]>): MockApiError {
  return new MockApiError("validation_failed", "Check the highlighted fields.", fieldErrors);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findCustomerByEmail(db: Db, email: string): CustomerRecord | undefined {
  const wanted = normalizeEmail(email);
  return db.users.find((u): u is CustomerRecord => u.kind === "customer" && u.email.toLowerCase() === wanted);
}

// --- Rate limits and cooldowns (keyed by email, so known and unknown emails behave alike) ---

function recentAttempts(db: Db, key: string, windowMs: number, wallMs: number): number[] {
  const kept = (db.throttle[key] ?? []).filter((t) => wallMs - t < windowMs);
  db.throttle[key] = kept;
  return kept;
}

/**
 * Seconds until another email of this kind may go to this address, or 0
 * (and the send is recorded). The caller answers the same either way.
 */
function takeCooldown(db: Db, key: string, wallMs: number): number {
  const windowMs = RESEND_COOLDOWN_SECONDS * 1000;
  const last = recentAttempts(db, key, windowMs, wallMs).at(-1);
  if (last !== undefined) return Math.ceil((windowMs - (wallMs - last)) / 1000);
  db.throttle[key] = [wallMs];
  return 0;
}

function cooldownResult(retryAfter: number): CooldownResult {
  return { ok: true, retryAfterSeconds: retryAfter || RESEND_COOLDOWN_SECONDS };
}

// --- Tokens ---

function issueToken(
  db: Db,
  kind: AuthTokenRecord["kind"],
  user: CustomerRecord,
  at: Date,
  extra: { returnTo?: string | null; save?: string | null } = {},
): AuthTokenRecord {
  // A newer link replaces older unused ones of the same kind.
  db.authTokens = db.authTokens.filter((t) => !(t.userId === user.id && t.kind === kind && t.usedAt === null));
  const ttl = kind === "password-reset" ? RESET_LINK_TTL_MINUTES : VERIFY_LINK_TTL_MINUTES;
  const record: AuthTokenRecord = {
    token: crypto.randomUUID().replaceAll("-", ""),
    kind,
    userId: user.id,
    email: user.email,
    expiresAt: addMinutes(at, ttl).toISOString(),
    usedAt: null,
    returnTo: extra.returnTo ?? null,
    save: extra.save ?? null,
  };
  db.authTokens.push(record);
  return record;
}

/** A usable token, or token_expired for unknown, used, expired or scenario-expired ones (A03, E10). */
function liveToken(db: Db, token: string, kind: AuthTokenRecord["kind"], ctx: Pick<AuthContext, "at" | "scenario">): AuthTokenRecord {
  const record = db.authTokens.find((t) => t.token === token && t.kind === kind);
  const forcedExpired =
    (kind === "verify-email" && ctx.scenario.tokens === "verification-expired") ||
    (kind === "password-reset" && ctx.scenario.tokens === "reset-expired");
  if (!record || record.usedAt !== null || forcedExpired || Date.parse(record.expiresAt) <= ctx.at.getTime()) {
    throw new MockApiError("token_expired", "This link is no longer valid.");
  }
  return record;
}

export function sendVerification(db: Db, user: CustomerRecord, at: Date, extra: { returnTo?: string | null; save?: string | null } = {}) {
  const record = issueToken(db, "verify-email", user, at, extra);
  sendEmail(
    db,
    {
      kind: "verify-email",
      to: user.email,
      subject: "Verify your email",
      body: `Hi ${user.firstName}, open this link to finish setting up your Bible Store account. It can be used once.`,
      link: `/verify-email?token=${record.token}`,
      code: null,
    },
    at,
  );
}

// --- A01 sign in ---

export type SignInOutcome = {
  sessionId: string;
  persistent: boolean;
  /** The cart this browser uses from now on (after the merge), if any. */
  cartToken: string | null;
  result: AuthResult;
};

/** Saves the ♡ tap carried through sign-in; the page shows only what the server confirmed. */
function finishPendingSave(db: Db, customerId: string, sku: string | null | undefined): PendingSaveResult | null {
  if (!sku) return null;
  try {
    addToWishlist(db, customerId, sku);
    return { sku, saved: true };
  } catch (error) {
    if (error instanceof MockApiError) return { sku, saved: false };
    throw error;
  }
}

function signIn(
  db: Db,
  user: CustomerRecord,
  ctx: AuthContext,
  options: { persistent: boolean; returnTo: string | null | undefined; save: string | null | undefined },
): SignInOutcome {
  const sessionId = createSession(db, user, ctx.at, options.persistent);
  const cart = mergeCartOnSignIn(db, ctx.cartToken, user.id);
  return {
    sessionId,
    persistent: options.persistent,
    cartToken: cart?.token ?? null,
    result: {
      returnTo: safeReturnTo(options.returnTo),
      pendingSave: finishPendingSave(db, user.id, options.save),
    },
  };
}

/**
 * A01. Unknown email, wrong password and staff accounts all get the same
 * E09 answer. Repeated failures for an email are rate limited, whether or
 * not the account exists.
 */
export function login(db: Db, body: unknown, ctx: AuthContext): SignInOutcome {
  const parsed = LoginInputSchema.safeParse(body);
  if (!parsed.success) throw invalid(zodFieldErrors(parsed.error));
  const input = parsed.data;
  const key = `login:${normalizeEmail(input.email)}`;
  const failures = recentAttempts(db, key, LOGIN_WINDOW_MS, ctx.wallMs);
  if (failures.length >= LOGIN_MAX_FAILURES) {
    throw new MockApiError("rate_limited", "Too many sign-in attempts. Wait 15 minutes, then try again, or reset your password.");
  }
  const user = findCustomerByEmail(db, input.email);
  if (!user || user.password !== input.password) {
    failures.push(ctx.wallMs);
    throw new MockApiError("invalid_credentials", "Email or password is incorrect");
  }
  db.throttle[key] = [];
  return signIn(db, user, ctx, { persistent: input.keepSignedIn, returnTo: input.returnTo, save: input.save });
}

// --- A02 create account ---

/**
 * A02 → A03. A new email gets an unverified account and a verification
 * link carrying the safe returnTo. An email that already has an account
 * gets a notice instead. The visitor sees the same A03 either way and is
 * not signed in until the link is opened.
 */
export function register(db: Db, body: unknown, ctx: AuthContext): { email: string } {
  const parsed = RegisterInputSchema.safeParse(body);
  if (!parsed.success) throw invalid(zodFieldErrors(parsed.error));
  const input = parsed.data;
  const email = input.email.trim();
  const existing = findCustomerByEmail(db, email) ?? db.users.find((u) => u.email.toLowerCase() === normalizeEmail(email));
  const returnTo = safeReturnTo(input.returnTo);
  takeCooldown(db, `verify:${normalizeEmail(email)}`, ctx.wallMs);

  if (existing) {
    sendEmail(
      db,
      {
        kind: "account-notice",
        to: existing.email,
        subject: "You already have an account",
        body: "Someone tried to create a Bible Store account with this email. If it was you, sign in or reset your password. If not, you can ignore this message.",
        link: "/password/forgot",
        code: null,
      },
      ctx.at,
    );
    return { email };
  }

  db.seq += 1;
  const user: CustomerRecord = {
    kind: "customer",
    id: `cus_${String(db.seq)}`,
    email,
    name: `${input.firstName} ${input.lastName}`,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: null,
    emailVerified: false,
    password: input.password,
    marketingOptIn: input.marketingOptIn,
    addresses: [],
  };
  db.users.push(user);
  sendVerification(db, user, ctx.at, { returnTo, save: input.save ?? null });
  return { email };
}

// --- A03 verify email ---

/**
 * Guest orders placed with the address just verified join the account
 * (Figma A02/A07: linking needs a verified matching email, never an order
 * number alone).
 */
export function linkGuestOrders(db: Db, user: CustomerRecord): number {
  let linked = 0;
  for (const order of db.orders) {
    if (order.customerId === null && order.email.toLowerCase() === user.email.toLowerCase()) {
      order.customerId = user.id;
      linked += 1;
    }
  }
  return linked;
}

/** A03 link: verifies the exact address it was sent to, then signs in and continues to returnTo. */
export function verifyEmail(db: Db, token: string, ctx: AuthContext): SignInOutcome & { verified: VerifyEmailResult } {
  const record = liveToken(db, token, "verify-email", ctx);
  const user = db.users.find((u): u is CustomerRecord => u.id === record.userId && u.kind === "customer");
  // The email changed since this link was sent: it proves nothing about the new one.
  if (!user || user.email !== record.email) throw new MockApiError("token_expired", "This link is no longer valid.");
  record.usedAt = ctx.at.toISOString();
  user.emailVerified = true;
  linkGuestOrders(db, user);
  const outcome = signIn(db, user, ctx, { persistent: false, returnTo: record.returnTo, save: record.save });
  return { ...outcome, verified: { email: user.email, returnTo: outcome.result.returnTo } };
}

/**
 * A03 "Resend email" / "Send a new link". Works from the signed-in
 * unverified customer, from an old link's token, or from the email typed
 * at sign-up; always the same generic answer.
 */
export function resendVerification(
  db: Db,
  source: { userId?: string; token?: string; email?: string },
  ctx: AuthContext,
): CooldownResult {
  const fromToken = source.token ? db.authTokens.find((t) => t.token === source.token && t.kind === "verify-email") : undefined;
  const userId = source.userId ?? fromToken?.userId;
  const user = userId
    ? db.users.find((u): u is CustomerRecord => u.id === userId && u.kind === "customer")
    : source.email
      ? findCustomerByEmail(db, source.email)
      : undefined;
  const address = user?.email ?? source.email ?? "";
  const retryAfter = takeCooldown(db, `verify:${normalizeEmail(address)}`, ctx.wallMs);
  if (retryAfter === 0 && user && !user.emailVerified) {
    sendVerification(db, user, ctx.at, { returnTo: fromToken?.returnTo ?? null, save: fromToken?.save ?? null });
  }
  return cooldownResult(retryAfter);
}

// --- A04–A06 password reset ---

/** A04: always the same answer; a link is sent only to an existing customer, at most once a minute. */
export function forgotPassword(db: Db, body: unknown, ctx: AuthContext): CooldownResult {
  const parsed = ForgotPasswordInputSchema.safeParse(body);
  if (!parsed.success) throw invalid(zodFieldErrors(parsed.error));
  const { email } = parsed.data;
  const retryAfter = takeCooldown(db, `reset:${normalizeEmail(email)}`, ctx.wallMs);
  const user = findCustomerByEmail(db, email);
  if (retryAfter === 0 && user) sendResetLink(db, user, ctx.at);
  return cooldownResult(retryAfter);
}

/** Issues a reset link and "emails" it; returns the link (dev presets open it directly). */
export function sendResetLink(db: Db, user: CustomerRecord, at: Date): string {
  const record = issueToken(db, "password-reset", user, at);
  const link = `/password/reset?token=${record.token}`;
  sendEmail(
    db,
    {
      kind: "password-reset",
      to: user.email,
      subject: "Password reset instructions",
      body: "Use this link to choose a new password. It expires after 30 minutes and works once. If you did not request this, ignore the message.",
      link,
      code: null,
    },
    at,
  );
  return link;
}

/** A06: checked before the form is enabled; E10 otherwise. */
export function checkResetToken(db: Db, token: string, ctx: Pick<AuthContext, "at" | "scenario">): void {
  liveToken(db, token, "password-reset", ctx);
}

/** A06 submit: single use, never the old password, and every session of the account ends. */
export function resetPassword(db: Db, body: unknown, ctx: Pick<AuthContext, "at" | "scenario">): void {
  const token = (body as { token?: unknown } | null)?.token;
  const record = liveToken(db, typeof token === "string" ? token : "", "password-reset", ctx);
  const parsed = ResetPasswordInputSchema.safeParse(body);
  if (!parsed.success) throw invalid(zodFieldErrors(parsed.error));
  const user = db.users.find((u): u is CustomerRecord => u.id === record.userId && u.kind === "customer");
  if (!user) throw new MockApiError("token_expired", "This link is no longer valid.");
  if (parsed.data.password === user.password) {
    throw invalid({ password: ["Choose a password you haven’t used for this account."] });
  }
  user.password = parsed.data.password;
  record.usedAt = ctx.at.toISOString();
  endUserSessions(db, user.id);
}
