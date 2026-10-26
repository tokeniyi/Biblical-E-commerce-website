import { describe, expect, it } from "vitest";
import { SAMPLE_NOW, addMinutes } from "../clock";
import { createSeed } from "../seed";
import { expireSession, lookupSession, requireSession } from "../services/auth";
import { approvePendingReviews, identityOfUser, switchIdentity } from "../services/dev";

describe("mock sessions", () => {
  it("switches to Jordan and reads back a customer session", () => {
    const db = createSeed();
    const id = switchIdentity(db, "customer", SAMPLE_NOW);
    const lookup = lookupSession(db, id ?? undefined, SAMPLE_NOW);
    expect(lookup).toMatchObject({ status: "active", session: { kind: "customer", email: "jordan@example.com" } });
  });

  it("gives staff sessions their role", () => {
    const db = createSeed();
    const id = switchIdentity(db, "staff:fulfillment", SAMPLE_NOW);
    expect(lookupSession(db, id ?? undefined, SAMPLE_NOW)).toMatchObject({
      session: { kind: "staff", role: "fulfillment" },
    });
  });

  it("signed-out creates no session", () => {
    expect(switchIdentity(createSeed(), "signed-out", SAMPLE_NOW)).toBeNull();
  });

  it("expires after the TTL and on 'expire now' (E11)", () => {
    const db = createSeed();
    const id = switchIdentity(db, "customer", SAMPLE_NOW) ?? undefined;
    expect(lookupSession(db, id, addMinutes(SAMPLE_NOW, 121)).status).toBe("expired");
    expireSession(db, id, SAMPLE_NOW);
    expect(lookupSession(db, id, SAMPLE_NOW).status).toBe("expired");
  });

  it("distinguishes expired (E11) from signed out (A14) on guarded calls", () => {
    expect(() => requireSession({ status: "expired" })).toThrow(expect.objectContaining({ code: "session_expired" }));
    expect(() => requireSession({ status: "none" })).toThrow(expect.objectContaining({ code: "unauthenticated" }));
  });

  it("maps a user back to its toolbar identity", () => {
    expect(identityOfUser("stf_alex")).toBe("staff:admin");
    expect(identityOfUser(null)).toBe("signed-out");
  });
});

describe("approvePendingReviews", () => {
  it("publishes only pending reviews", () => {
    const db = createSeed();
    const base = {
      productSlug: "esv-study-bible",
      sku: "ESV-ST-HC",
      authorName: "Jordan L.",
      customerId: "cus_jordan",
      verifiedPurchase: true,
      helpfulCount: 0,
      createdAt: SAMPLE_NOW.toISOString(),
      rating: 5,
      title: "Great",
      body: "Clear notes and sturdy binding.",
    };
    db.reviews.push({ ...base, id: "r1", status: "pending" }, { ...base, id: "r2", status: "rejected" });
    expect(approvePendingReviews(db)).toBe(1);
    expect(db.reviews.map((r) => r.status)).toEqual(["published", "rejected"]);
  });
});
