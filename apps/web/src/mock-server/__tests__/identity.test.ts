import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIO } from "@/lib/dev/scenario-defs";
import { SAMPLE_NOW, addMinutes } from "../clock";
import { MockApiError } from "../http";
import { SEED_PASSWORD, createSeed } from "../seed";
import { createSession, lookupSession } from "../services/auth";
import {
  LOGIN_MAX_FAILURES,
  checkResetToken,
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  type AuthContext,
} from "../services/identity";
import type { CustomerRecord, Db } from "../types";

function ctx(overrides: Partial<AuthContext> = {}): AuthContext {
  return { at: SAMPLE_NOW, wallMs: 1_000_000, scenario: DEFAULT_SCENARIO, cartToken: undefined, ...overrides };
}

function codeOf(fn: () => unknown): string {
  try {
    fn();
    return "no error";
  } catch (error) {
    return error instanceof MockApiError ? error.code : "wrong error type";
  }
}

function lastLink(db: Db, kind: string): string {
  const message = db.outbox.find((m) => m.kind === kind);
  if (!message?.link) throw new Error(`no ${kind} email`);
  return message.link;
}

function tokenOf(link: string): string {
  return new URL(link, "http://x").searchParams.get("token") ?? "";
}

const NEW_ACCOUNT = {
  firstName: "Casey",
  lastName: "Nguyen",
  email: "casey@example.com",
  password: "a long enough passphrase",
  confirmPassword: "a long enough passphrase",
  termsAccepted: true,
  returnTo: "/checkout/delivery",
};

describe("login (A01 / E09)", () => {
  it("signs Jordan in and returns the safe returnTo", () => {
    const db = createSeed();
    const outcome = login(db, { email: "JORDAN@example.com", password: SEED_PASSWORD, returnTo: "/checkout/delivery" }, ctx());
    expect(outcome.result).toEqual({ returnTo: "/checkout/delivery", pendingSave: null });
    expect(lookupSession(db, outcome.sessionId, SAMPLE_NOW)).toMatchObject({ status: "active", session: { userId: "cus_jordan" } });
  });

  it("rejects an external returnTo", () => {
    const db = createSeed();
    const outcome = login(db, { email: "jordan@example.com", password: SEED_PASSWORD, returnTo: "https://evil.example" }, ctx());
    expect(outcome.result.returnTo).toBe("/account");
  });

  it("answers the same for a wrong password, an unknown email and a staff account", () => {
    const db = createSeed();
    expect(codeOf(() => login(db, { email: "jordan@example.com", password: "wrong" }, ctx()))).toBe("invalid_credentials");
    expect(codeOf(() => login(db, { email: "nobody@example.com", password: "wrong" }, ctx()))).toBe("invalid_credentials");
    expect(codeOf(() => login(db, { email: "alex@store.example", password: SEED_PASSWORD }, ctx()))).toBe("invalid_credentials");
  });

  it("rate-limits repeated failures per email, known or not, then lets the window pass", () => {
    const db = createSeed();
    for (const email of ["jordan@example.com", "nobody@example.com"]) {
      for (let i = 0; i < LOGIN_MAX_FAILURES; i++) codeOf(() => login(db, { email, password: "wrong" }, ctx()));
      expect(codeOf(() => login(db, { email, password: SEED_PASSWORD }, ctx()))).toBe("rate_limited");
    }
    const later = ctx({ wallMs: 1_000_000 + 16 * 60_000 });
    expect(codeOf(() => login(db, { email: "jordan@example.com", password: SEED_PASSWORD }, later))).toBe("no error");
  });

  it("keep me signed in makes a 30-day session", () => {
    const db = createSeed();
    const outcome = login(db, { email: "jordan@example.com", password: SEED_PASSWORD, keepSignedIn: true }, ctx());
    expect(outcome.persistent).toBe(true);
    expect(lookupSession(db, outcome.sessionId, addMinutes(SAMPLE_NOW, 60 * 24 * 29)).status).toBe("active");
  });

  it("saves the ♡ carried through sign-in, and reports one it could not save", () => {
    const db = createSeed();
    const saved = login(db, { email: "sam@example.com", password: SEED_PASSWORD, save: "KJV-LP-LL" }, ctx());
    expect(saved.result.pendingSave).toEqual({ sku: "KJV-LP-LL", saved: true });
    expect(db.wishlists.cus_sam).toEqual(["KJV-LP-LL"]);
    const draft = login(db, { email: "sam@example.com", password: SEED_PASSWORD, save: "ESV-ST-LL-LP" }, ctx());
    expect(draft.result.pendingSave).toEqual({ sku: "ESV-ST-LL-LP", saved: false });
    expect(db.wishlists.cus_sam).toEqual(["KJV-LP-LL"]);
  });
});

describe("register → verify (A02 → A03)", () => {
  it("creates an unverified account, signs nobody in, and emails a single-use link", () => {
    const db = createSeed();
    const sessions = db.sessions.length;
    expect(register(db, NEW_ACCOUNT, ctx())).toEqual({ email: "casey@example.com" });
    expect(db.sessions.length).toBe(sessions);
    const user = db.users.find((u) => u.email === "casey@example.com") as CustomerRecord;
    expect(user).toMatchObject({ emailVerified: false, marketingOptIn: false, firstName: "Casey", name: "Casey Nguyen" });

    const token = tokenOf(lastLink(db, "verify-email"));
    const outcome = verifyEmail(db, token, ctx());
    expect(outcome.verified).toEqual({ email: "casey@example.com", returnTo: "/checkout/delivery" });
    expect(user.emailVerified).toBe(true);
    expect(lookupSession(db, outcome.sessionId, SAMPLE_NOW).status).toBe("active");
    expect(codeOf(() => verifyEmail(db, token, ctx()))).toBe("token_expired");
  });

  it("does not reveal an existing account: same answer, a notice email, no new user", () => {
    const db = createSeed();
    const users = db.users.length;
    expect(register(db, { ...NEW_ACCOUNT, email: "jordan@example.com" }, ctx())).toEqual({ email: "jordan@example.com" });
    expect(db.users.length).toBe(users);
    expect(db.outbox[0]).toMatchObject({ kind: "account-notice", to: "jordan@example.com" });
  });

  it("links guest orders with the verified email, never by order number", () => {
    const db = createSeed();
    const sample = db.orders.find((o) => o.id === "BS-10428");
    if (!sample) throw new Error("seed has no BS-10428");
    const guestOrder = { ...sample, id: "BS-20000", customerId: null, email: "casey@example.com" };
    db.orders.push(guestOrder);
    register(db, NEW_ACCOUNT, ctx());
    expect(guestOrder.customerId).toBeNull();
    verifyEmail(db, tokenOf(lastLink(db, "verify-email")), ctx());
    expect(guestOrder.customerId).toMatch(/^cus_/);
  });

  it("treats links as expired when the Auth tokens scenario says so", () => {
    const db = createSeed();
    register(db, NEW_ACCOUNT, ctx());
    const token = tokenOf(lastLink(db, "verify-email"));
    const expired = ctx({ scenario: { ...DEFAULT_SCENARIO, tokens: "verification-expired" } });
    expect(codeOf(() => verifyEmail(db, token, expired))).toBe("token_expired");
  });

  it("resend honours the 60 s cooldown and answers the same either way", () => {
    const db = createSeed();
    register(db, NEW_ACCOUNT, ctx());
    const sent = db.outbox.length;
    const early = resendVerification(db, { email: "casey@example.com" }, ctx({ wallMs: 1_000_000 + 10_000 }));
    expect(early).toEqual({ ok: true, retryAfterSeconds: 50 });
    expect(db.outbox.length).toBe(sent);
    const later = resendVerification(db, { email: "casey@example.com" }, ctx({ wallMs: 1_000_000 + 61_000 }));
    expect(later).toEqual({ ok: true, retryAfterSeconds: 60 });
    expect(db.outbox.length).toBe(sent + 1);
    expect(resendVerification(db, { email: "nobody@example.com" }, ctx())).toEqual({ ok: true, retryAfterSeconds: 60 });
  });
});

describe("password reset (A04 → A06 / E10)", () => {
  it("answers the same for registered and unknown emails; only a customer gets a link", () => {
    const db = createSeed();
    expect(forgotPassword(db, { email: "nobody@example.com" }, ctx())).toEqual({ ok: true, retryAfterSeconds: 60 });
    expect(db.outbox).toHaveLength(0);
    expect(forgotPassword(db, { email: "jordan@example.com" }, ctx())).toEqual({ ok: true, retryAfterSeconds: 60 });
    expect(db.outbox[0]).toMatchObject({ kind: "password-reset", to: "jordan@example.com" });
  });

  it("validates the email format", () => {
    expect(codeOf(() => forgotPassword(createSeed(), { email: "jordan@" }, ctx()))).toBe("validation_failed");
  });

  it("resets once, refuses the old password, and signs the account out everywhere", () => {
    const db = createSeed();
    const jordan = db.users.find((u) => u.id === "cus_jordan") as CustomerRecord;
    const other = createSession(db, jordan, SAMPLE_NOW);
    forgotPassword(db, { email: "jordan@example.com" }, ctx());
    const token = tokenOf(lastLink(db, "password-reset"));
    expect(codeOf(() => { checkResetToken(db, token, ctx()); })).toBe("no error");
    expect(codeOf(() => { resetPassword(db, { token, password: SEED_PASSWORD, confirmPassword: SEED_PASSWORD }, ctx()); })).toBe(
      "validation_failed",
    );
    resetPassword(db, { token, password: "a brand new passphrase", confirmPassword: "a brand new passphrase" }, ctx());
    expect(jordan.password).toBe("a brand new passphrase");
    expect(lookupSession(db, other, SAMPLE_NOW).status).toBe("none");
    expect(codeOf(() => { checkResetToken(db, token, ctx()); })).toBe("token_expired");
  });

  it("expires after 30 minutes, and on the reset-expired scenario", () => {
    const db = createSeed();
    forgotPassword(db, { email: "jordan@example.com" }, ctx());
    const token = tokenOf(lastLink(db, "password-reset"));
    expect(codeOf(() => { checkResetToken(db, token, ctx({ at: addMinutes(SAMPLE_NOW, 31) })); })).toBe("token_expired");
    const forced = ctx({ scenario: { ...DEFAULT_SCENARIO, tokens: "reset-expired" } });
    expect(codeOf(() => { checkResetToken(db, token, forced); })).toBe("token_expired");
    expect(codeOf(() => { checkResetToken(db, "made-up", ctx()); })).toBe("token_expired");
  });
});
