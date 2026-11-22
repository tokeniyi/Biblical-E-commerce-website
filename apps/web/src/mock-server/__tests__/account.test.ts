import { beforeEach, describe, expect, it } from "vitest";
import { safeReturnTo } from "@your-app/shared";
import { SAMPLE_NOW } from "../clock";
import { customerOrder, customerOrders, register, removeFromWishlist, signIn, wishlistItems } from "../services/account";
import { addToWishlist } from "../services/wishlist";
import { resetDb } from "../store";
import type { Db } from "../types";

let db: Db;
beforeEach(() => {
  db = resetDb();
});

describe("signIn", () => {
  const base = { email: "jordan@example.com", password: "wireframe-password", audience: "customer" as const };

  it("signs a customer in (email is case-insensitive)", () => {
    const { user, sessionId } = signIn(db, { ...base, email: "Jordan@Example.com" }, SAMPLE_NOW);
    expect(user.id).toBe("cus_jordan");
    expect(db.sessions.some((s) => s.id === sessionId)).toBe(true);
  });

  it("gives one generic error for unknown email, wrong password and wrong audience", () => {
    const messages = [
      { ...base, email: "nobody@example.com" },
      { ...base, password: "nope" },
      { ...base, audience: "staff" as const },
      { email: "alex@store.example", password: "wireframe-password", audience: "customer" as const },
    ].map((input) => {
      try {
        signIn(db, input, SAMPLE_NOW);
        return "signed in";
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/don’t match an account/);
  });

  it("staff sign in on the staff audience", () => {
    expect(signIn(db, { email: "alex@store.example", password: "wireframe-password", audience: "staff" }, SAMPLE_NOW).user.kind).toBe("staff");
  });
});

describe("register", () => {
  it("creates an unverified customer, signs in and sends a verification email", () => {
    const { user } = register(db, { name: "Riley Stone", email: "Riley@Example.com", password: "a-long-password", marketingOptIn: true }, SAMPLE_NOW);
    expect(user).toMatchObject({ email: "riley@example.com", emailVerified: false, marketingOptIn: true });
    expect(db.outbox[0]).toMatchObject({ kind: "verify-email", to: "riley@example.com" });
  });

  it("rejects an email already in use with a field error", () => {
    expect(() => register(db, { name: "J", email: "jordan@example.com", password: "a-long-password", marketingOptIn: false }, SAMPLE_NOW)).toThrow(
      /Check the highlighted field/,
    );
  });
});

describe("orders", () => {
  it("lists only the customer's orders, newest first", () => {
    expect(customerOrders(db, "cus_jordan").map((o) => o.id)).toEqual(["BS-10428", "BS-10392"]);
    expect(customerOrders(db, "cus_maya")).toEqual([]);
  });

  it("hides other customers' orders as not found", () => {
    expect(customerOrder(db, "cus_jordan", "BS-10428").id).toBe("BS-10428");
    expect(() => customerOrder(db, "cus_maya", "BS-10428")).toThrow(/couldn’t find/);
  });
});

describe("wishlist items", () => {
  it("returns product details and supports removal", () => {
    addToWishlist(db, "cus_jordan", "ESV-ST-HC");
    expect(wishlistItems(db, "cus_jordan")).toEqual([
      expect.objectContaining({ sku: "ESV-ST-HC", productSlug: "esv-study-bible", priceCents: 3900 }),
    ]);
    removeFromWishlist(db, "cus_jordan", "ESV-ST-HC");
    expect(wishlistItems(db, "cus_jordan")).toEqual([]);
  });
});

describe("safeReturnTo", () => {
  it.each([
    ["/account/orders", "/account/orders"],
    ["//evil.example", "/account"],
    ["https://evil.example", "/account"],
    ["/\\evil.example", "/account"],
    ["javascript:alert(1)", "/account"],
    [null, "/account"],
  ])("%s → %s", (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
