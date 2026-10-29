import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIO } from "@/lib/dev/scenario-defs";
import { SAMPLE_NOW } from "../clock";
import { MockApiError } from "../http";
import { createSeed } from "../seed";
import {
  accountOverview,
  addAddress,
  deleteAddress,
  updateAddress,
  updateProfile,
  wishlistItems,
} from "../services/account";
import { cartView, ensureCart, mergeCartOnSignIn, resolveMergeConflict } from "../services/cart";
import { cartChanges } from "../services/checkout";
import { approvePendingReviews } from "../services/dev";
import { customerOrderDetail, listCustomerOrders, reorder } from "../services/orders";
import { deleteReview, myReviews, reviewForm, submitReview } from "../services/reviews";
import type { CustomerRecord, Db } from "../types";

const scenario = DEFAULT_SCENARIO;

function codeOf(fn: () => unknown): string {
  try {
    fn();
    return "no error";
  } catch (error) {
    return error instanceof MockApiError ? error.code : "wrong error type";
  }
}

function customer(db: Db, id: string): CustomerRecord {
  const user = db.users.find((u) => u.id === id);
  if (user?.kind !== "customer") throw new Error(id);
  return user;
}

const ADDRESS = {
  fullName: "Jordan Lee",
  email: "jordan@example.com",
  line1: "1 Pine Road",
  city: "Salem",
  state: "OR",
  zip: "97301",
  country: "US",
};

describe("A07 overview", () => {
  it("matches the drawn cards for Jordan", () => {
    const db = createSeed();
    expect(accountOverview(db, customer(db, "cus_jordan"), scenario)).toMatchObject({
      name: "Jordan Lee",
      emailVerified: true,
      addresses: { count: 1, defaultPlace: "Portland, Oregon" },
      orders: { count: 2, processing: 1, latest: { id: "BS-10428", totalCents: 7304, status: "processing" } },
      wishlistCount: 4,
      reviewCount: 1,
      awaitingReviewCount: 1,
    });
  });
});

describe("A08 profile", () => {
  it("a new email is unverified and gets its own link; past orders keep theirs", () => {
    const db = createSeed();
    const jordan = customer(db, "cus_jordan");
    const result = updateProfile(db, jordan, { firstName: "Jordan", lastName: "Lee-Park", email: "jl@example.com", marketingOptIn: true }, SAMPLE_NOW);
    expect(result).toMatchObject({ verificationSentTo: "jl@example.com", profile: { emailVerified: false, lastName: "Lee-Park" } });
    expect(jordan.name).toBe("Jordan Lee-Park");
    expect(db.outbox[0]).toMatchObject({ kind: "verify-email", to: "jl@example.com" });
    expect(db.orders.find((o) => o.id === "BS-10428")?.email).toBe("jordan@example.com");
  });

  it("keeps verification when the email doesn't change, and refuses another account's email", () => {
    const db = createSeed();
    const jordan = customer(db, "cus_jordan");
    expect(updateProfile(db, jordan, { firstName: "J", lastName: "Lee", email: "JORDAN@example.com", marketingOptIn: false }, SAMPLE_NOW).verificationSentTo).toBeNull();
    expect(jordan.emailVerified).toBe(true);
    expect(codeOf(() => updateProfile(db, jordan, { firstName: "J", lastName: "Lee", email: "sam@example.com", marketingOptIn: false }, SAMPLE_NOW))).toBe(
      "validation_failed",
    );
  });
});

describe("A09 addresses", () => {
  it("the first address is the default; a new default replaces it; deleting the default promotes the next", () => {
    const db = createSeed();
    const sam = customer(db, "cus_sam");
    const first = addAddress(db, sam, ADDRESS);
    expect(first.isDefault).toBe(true);
    const second = addAddress(db, sam, { ...ADDRESS, line1: "2 Elm Road", isDefault: true });
    expect(sam.addresses.map((a) => a.isDefault)).toEqual([false, true]);
    deleteAddress(sam, second.id);
    expect(sam.addresses.map((a) => [a.line1, a.isDefault])).toEqual([["1 Pine Road", true]]);
  });

  it("validates like O03 (E07) and only edits the customer's own addresses", () => {
    const db = createSeed();
    const sam = customer(db, "cus_sam");
    expect(codeOf(() => addAddress(db, sam, { ...ADDRESS, zip: "97" }))).toBe("validation_failed");
    expect(codeOf(() => updateAddress(sam, "addr_jordan_home", ADDRESS))).toBe("not_found");
  });
});

describe("A10 / A11 orders", () => {
  it("lists only the customer's orders, newest first, with filters and search", () => {
    const db = createSeed();
    expect(listCustomerOrders(db, "cus_jordan", { status: "all", q: "", page: 1 }, scenario).items.map((o) => o.id)).toEqual([
      "BS-10428",
      "BS-10392",
    ]);
    expect(listCustomerOrders(db, "cus_jordan", { status: "delivered", q: "", page: 1 }, scenario).items.map((o) => o.id)).toEqual(["BS-10392"]);
    expect(listCustomerOrders(db, "cus_jordan", { status: "all", q: "10392", page: 1 }, scenario).total).toBe(1);
    expect(listCustomerOrders(db, "cus_robin", { status: "all", q: "", page: 1 }, scenario)).toMatchObject({ total: 0, hasOrders: false });
  });

  it("someone else's order is the same not_found as a missing one", () => {
    const db = createSeed();
    expect(codeOf(() => customerOrderDetail(db, "cus_sam", "BS-10428", scenario, SAMPLE_NOW))).toBe("not_found");
    expect(codeOf(() => customerOrderDetail(db, "cus_sam", "BS-99999", scenario, SAMPLE_NOW))).toBe("not_found");
  });

  it("follows the BS-10428 snapshot: processing can cancel, shipped can't, delivered can return and review", () => {
    const db = createSeed();
    const at = (order: "processing" | "shipped" | "delivered") =>
      customerOrderDetail(db, "cus_jordan", "BS-10428", { ...scenario, order }, SAMPLE_NOW);
    expect(at("processing")).toMatchObject({ status: "processing", canCancel: true, canReturn: false, estimate: "12–14 Oct" });
    expect(at("shipped")).toMatchObject({ status: "shipped", canCancel: false });
    // Jordan already reviewed the NIV, so only the ESV is waiting.
    expect(at("delivered")).toMatchObject({ status: "delivered", canReturn: true, reviewable: [{ sku: "ESV-ST-HC" }] });
    expect(db.orders.find((o) => o.id === "BS-10428")?.fulfillmentStatus).toBe("unfulfilled");
  });

  it("Reorder adds the lines at the paid price, so O01 shows today's differences (E06)", () => {
    const db = createSeed();
    const esv = db.products.find((p) => p.slug === "esv-study-bible")?.variants.find((v) => v.sku === "ESV-ST-HC");
    if (!esv) throw new Error("seed");
    esv.priceCents = 4100;
    const cart = ensureCart(db, undefined);
    expect(reorder(db, "cus_jordan", "BS-10428", cart, scenario).added).toHaveLength(2);
    expect(cart.lines).toEqual([
      { sku: "ESV-ST-HC", quantity: 1, unitPriceCents: 3900 },
      { sku: "NIV-EV-PB", quantity: 1, unitPriceCents: 2400 },
    ]);
    expect(cartChanges(db, cart)).toMatchObject([{ sku: "ESV-ST-HC", currentPriceCents: 4100 }]);
  });
});

describe("A12 wishlist items", () => {
  it("shows current price and stock, with the sold-out NLT", () => {
    const db = createSeed();
    const items = wishlistItems(db, "cus_jordan").items;
    expect(items.map((i) => [i.sku, i.available])).toEqual([
      ["ESV-ST-HC", 12],
      ["NIV-EV-PB", 26],
      ["KJV-LP-LL", 8],
      ["NLT-CH-HC", 0],
    ]);
  });
});

describe("A13 reviews", () => {
  const body = { rating: 5, title: "Clear notes and sturdy binding", body: "The notes make difficult passages easier to understand." };

  it("lists Jordan's NIV review and the ESV waiting for one", () => {
    const db = createSeed();
    expect(myReviews(db, "cus_jordan", scenario)).toMatchObject({
      reviews: [{ title: "Useful everyday edition", status: "published", orderId: "BS-10392", sku: "NIV-EV-PB" }],
      awaiting: [{ orderId: "BS-10392", sku: "ESV-ST-HC" }],
    });
  });

  it("only delivered purchases are eligible", () => {
    const db = createSeed();
    expect(reviewForm(db, "cus_jordan", "BS-10428", "ESV-ST-HC", scenario)).toMatchObject({ status: "ineligible", reason: "not-delivered" });
    expect(reviewForm(db, "cus_jordan", "BS-10392", "KJV-LP-LL", scenario)).toMatchObject({ status: "ineligible", reason: "not-purchased" });
    expect(codeOf(() => reviewForm(db, "cus_sam", "BS-10392", "ESV-ST-HC", scenario))).toBe("not_found");
    const jordan = customer(db, "cus_jordan");
    expect(codeOf(() => submitReview(db, jordan, "BS-10428", "ESV-ST-HC", body, scenario, SAMPLE_NOW))).toBe("forbidden");
  });

  it("a new review is pending, verified, and public on C06 only after approval", () => {
    const db = createSeed();
    const review = submitReview(db, customer(db, "cus_jordan"), "BS-10392", "ESV-ST-HC", body, scenario, SAMPLE_NOW);
    expect(review).toMatchObject({ status: "pending", verifiedPurchase: true, authorName: "Jordan L.", orderId: "BS-10392" });
    const esv = () => db.products.find((p) => p.slug === "esv-study-bible")?.rating;
    expect(esv()?.count).toBe(124);
    approvePendingReviews(db);
    expect(esv()).toEqual({ average: 4.8, count: 125, histogram: [99, 19, 5, 1, 1] });
  });

  it("editing a published review sends it back to moderation; deleting removes it from C06", () => {
    const db = createSeed();
    const jordan = customer(db, "cus_jordan");
    const niv = () => db.products.find((p) => p.slug === "niv-everyday-bible")?.rating ?? null;
    submitReview(db, jordan, "BS-10392", "NIV-EV-PB", { ...body, rating: 3 }, scenario, SAMPLE_NOW);
    expect(db.reviews.find((r) => r.id === "rev_jordan_niv")).toMatchObject({ status: "pending", rating: 3 });
    expect(niv()).toBeNull();
    approvePendingReviews(db);
    expect(niv()).toEqual({ average: 3, count: 1, histogram: [0, 0, 1, 0, 0] });
    deleteReview(db, "cus_jordan", "rev_jordan_niv");
    expect(niv()).toBeNull();
    expect(codeOf(() => { deleteReview(db, "cus_sam", "rev_taylor"); })).toBe("not_found");
  });
});

describe("sign-in cart merge (spec §5.1)", () => {
  it("keeps this visit's quantity on a conflict, adds the rest, and never sums", () => {
    const db = createSeed();
    const account = ensureCart(db, undefined);
    account.customerId = "cus_jordan";
    account.lines = [
      { sku: "NIV-EV-PB", quantity: 2, unitPriceCents: 2400 },
      { sku: "KJV-LP-LL", quantity: 1, unitPriceCents: 3200 },
    ];
    const browser = ensureCart(db, undefined);
    browser.lines = [
      { sku: "NIV-EV-PB", quantity: 1, unitPriceCents: 2400 },
      { sku: "ESV-ST-HC", quantity: 1, unitPriceCents: 3900 },
    ];
    const merged = mergeCartOnSignIn(db, browser.token, "cus_jordan");
    expect(merged).toBe(account);
    expect(account.lines.map((l) => [l.sku, l.quantity])).toEqual([
      ["NIV-EV-PB", 1],
      ["KJV-LP-LL", 1],
      ["ESV-ST-HC", 1],
    ]);
    expect(cartView(db, account).mergeConflicts).toEqual([
      { sku: "NIV-EV-PB", productName: "NIV Everyday Bible", keptQuantity: 1, accountQuantity: 2 },
    ]);
    expect(db.carts).not.toContain(browser);

    resolveMergeConflict(db, account.token, "NIV-EV-PB", "account");
    expect(account.lines.find((l) => l.sku === "NIV-EV-PB")?.quantity).toBe(2);
    expect(account.mergeConflicts).toEqual([]);
  });

  it("links an anonymous cart to the customer when they have none", () => {
    const db = createSeed();
    const browser = ensureCart(db, undefined);
    expect(mergeCartOnSignIn(db, browser.token, "cus_sam")).toBe(browser);
    expect(browser.customerId).toBe("cus_sam");
  });

  it("never merges another customer's cart left in a shared browser", () => {
    const db = createSeed();
    const jordans = ensureCart(db, undefined);
    jordans.customerId = "cus_jordan";
    jordans.lines = [{ sku: "ESV-ST-HC", quantity: 1, unitPriceCents: 3900 }];
    expect(mergeCartOnSignIn(db, jordans.token, "cus_sam")).toBeUndefined();
    expect(jordans.customerId).toBe("cus_jordan");
  });
});
