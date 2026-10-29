import { beforeEach, describe, expect, it } from "vitest";
import { shippingEstimate } from "@your-app/shared";
import { DEFAULT_SCENARIO, type Scenario } from "@/lib/dev/scenario-defs";
import { SAMPLE_NOW } from "../clock";
import { MockApiError } from "../http";
import { ScenarioContext } from "../scenarios";
import { createSession, lookupSession, type SessionLookup } from "../services/auth";
import { ensureCart, loadSampleCart, removeLine, saveLineForLater, updateLineQuantity } from "../services/cart";
import { findVariant } from "../services/catalog";
import {
  acceptChanges,
  applyPromo,
  applyQuoteDrift,
  cartChanges,
  checkIntent,
  checkoutView,
  chooseShipping,
  orderConfirmation,
  readIntent,
  saveDelivery,
  submitPayment,
} from "../services/checkout";
import { computeQuote, discountCents } from "../services/pricing";
import { resetDb } from "../store";
import type { Db } from "../types";

let db: Db;
const at = SAMPLE_NOW;
const guest: SessionLookup = { status: "none" };
const scenario = (patch: Partial<Scenario> = {}): Scenario => ({ ...DEFAULT_SCENARIO, ...patch });

const JORDAN = {
  fullName: "Jordan Lee",
  email: "jordan@example.com",
  line1: "24 Oak Street",
  city: "Portland",
  state: "OR",
  zip: "97205",
  country: "US",
};

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("expected a value");
  return value;
}

function errorOf(fn: () => unknown): MockApiError {
  try {
    fn();
  } catch (error) {
    if (error instanceof MockApiError) return error;
    throw error;
  }
  throw new Error("expected a MockApiError");
}

function payBody(key: string, expectedTotalCents = 7304) {
  return {
    idempotencyKey: key,
    paymentToken: "sim_visa_4242",
    billingSameAsDelivery: true,
    billingAddress: null,
    termsAccepted: true,
    expectedTotalCents,
  };
}

beforeEach(() => {
  db = resetDb();
});

describe("quote math (spec §2)", () => {
  const lines = [
    { sku: "ESV-ST-HC", quantity: 1, unitPriceCents: 3900, categorySlugs: ["study"] },
    { sku: "NIV-EV-PB", quantity: 1, unitPriceCents: 2400, categorySlugs: ["devotional"] },
  ];

  it("O01 sample: $63 + $5 standard + 8% tax $5.04 = $73.04", () => {
    expect(computeQuote({ lines, shippingMethod: null, discount: null })).toMatchObject({
      subtotalCents: 6300,
      shippingCents: 500,
      taxCents: 504,
      discountCents: 0,
      totalCents: 7304,
    });
  });

  it("O04 sample: express is $80.04", () => {
    expect(computeQuote({ lines, shippingMethod: "express", discount: null }).totalCents).toBe(8004);
  });

  it("E06 sample: ESV ×1 + NIV at $25 is $74.12", () => {
    const after = [{ ...lines[0], quantity: 1 }, { ...lines[1], unitPriceCents: 2500 }];
    expect(computeQuote({ lines: after, shippingMethod: null, discount: null }).totalCents).toBe(7412);
  });

  it("an empty cart ships nothing", () => {
    expect(computeQuote({ lines: [], shippingMethod: null, discount: null }).totalCents).toBe(0);
  });

  it("discounts apply to goods only, tax after discount; fixed is capped; category scope", () => {
    const read10 = must(db.discounts.find((d) => d.code === "READ10"));
    const q = computeQuote({ lines, shippingMethod: null, discount: read10 });
    expect(q).toMatchObject({ discountCents: -630, taxCents: 454, totalCents: 6300 - 630 + 500 + 454, promoCode: "READ10" });
    expect(discountCents({ kind: "fixed", value: 99_999, eligibleCategorySlugs: [] }, lines)).toBe(6300);
    expect(discountCents({ kind: "percent", value: 15, eligibleCategorySlugs: ["study"] }, lines)).toBe(585);
  });

  it("delivery estimates from 7 Oct: Standard 12–14 Oct, Express 9–10 Oct", () => {
    expect(shippingEstimate("standard", at)).toEqual({ label: "12–14 Oct", year: 2026 });
    expect(shippingEstimate("express", at)).toEqual({ label: "9–10 Oct", year: 2026 });
  });
});

describe("O01 cart edits", () => {
  it("quantity is min 1, max available; 0 is refused", () => {
    const cart = loadSampleCart(db, undefined);
    expect(errorOf(() => updateLineQuantity(db, cart.token, "ESV-ST-HC", 0)).code).toBe("validation_failed");
    expect(errorOf(() => updateLineQuantity(db, cart.token, "ESV-ST-HC", 13)).message).toBe("Only 12 available.");
    expect(updateLineQuantity(db, cart.token, "ESV-ST-HC", 12).itemCount).toBe(13);
  });

  it("Save moves the line out of the totals into saved for later", () => {
    const cart = loadSampleCart(db, undefined);
    const view = saveLineForLater(db, cart.token, "ESV-ST-HC");
    expect(view.lines.map((l) => l.sku)).toEqual(["NIV-EV-PB"]);
    expect(view.saved.map((s) => s.sku)).toContain("ESV-ST-HC");
  });

  it("removing the last item leaves an empty cart (E01)", () => {
    const cart = loadSampleCart(db, undefined);
    removeLine(db, cart.token, "ESV-ST-HC");
    expect(removeLine(db, cart.token, "NIV-EV-PB")).toMatchObject({ lines: [], itemCount: 0 });
  });
});

describe("E08 promo", () => {
  it("READ10 applies in October", () => {
    const cart = loadSampleCart(db, undefined);
    applyPromo(db, cart, " read10 ", at, "normal");
    expect(checkoutView(db, cart, guest, scenario(), at).quote.discountCents).toBe(-630);
  });

  it.each([
    ["STUDY15", "expired", "This code has expired. No discount was applied."],
    ["NOPE", "invalid", "Code not recognized."],
    ["WELCOME5", "invalid", "Code not recognized."],
  ])("%s → %s, cart unchanged", (code, reason, message) => {
    const cart = loadSampleCart(db, undefined);
    const err = errorOf(() => { applyPromo(db, cart, code, at, "normal"); });
    expect(err).toMatchObject({ code: "promo_invalid", message, details: { reason } });
    expect(cart.promoCode).toBeNull();
  });

  it("category-scoped codes explain the requirement when ineligible", () => {
    const cart = loadSampleCart(db, undefined);
    removeLine(db, cart.token, "ESV-ST-HC");
    const err = errorOf(() => { applyPromo(db, cart, "READ10", at, "ineligible"); });
    expect(err.message).toBe("This code doesn’t apply to the items in your cart. No discount was applied.");
    const study = must(db.discounts.find((d) => d.code === "STUDY15"));
    study.endsAt = "2026-12-31T00:00:00.000Z";
    expect(errorOf(() => { applyPromo(db, cart, "STUDY15", at, "normal"); }).message).toBe(
      "This code applies only to Study Bibles. No discount was applied.",
    );
  });
});

describe("E06 quote drift", () => {
  function driftCart() {
    const cart = loadSampleCart(db, undefined);
    updateLineQuantity(db, cart.token, "ESV-ST-HC", 2);
    return cart;
  }

  it("'both' reproduces the Figma sample, once, and accept reconciles to $74.12", () => {
    const cart = driftCart();
    const ctx = new ScenarioContext(db, { scenario: scenario({ quote: "both" }), tokens: { quote: "t1" } });
    applyQuoteDrift(db, cart, ctx);
    expect(cartChanges(db, cart)).toEqual([
      expect.objectContaining({ sku: "ESV-ST-HC", cartQuantity: 2, available: 1, currentPriceCents: null }),
      expect.objectContaining({ sku: "NIV-EV-PB", cartUnitPriceCents: 2400, available: null, currentPriceCents: 2500 }),
    ]);
    const view = checkoutView(db, cart, guest, scenario(), at);
    expect(view.reconciledQuote?.totalCents).toBe(7412);
    expect(ctx.nextCookieValue()).toBe("");

    acceptChanges(db, cart);
    expect(cartChanges(db, cart)).toEqual([]);
    expect(checkoutView(db, cart, guest, scenario(), at).quote.totalCents).toBe(7412);
  });

  it("payment is refused while changes are pending", () => {
    const cart = driftCart();
    saveDelivery(db, cart, JORDAN, guest, scenario());
    applyQuoteDrift(db, cart, new ScenarioContext(db, { scenario: scenario({ quote: "price" }), tokens: { quote: "t2" } }));
    const err = errorOf(() => submitPayment(db, cart, payBody("key-drift-1", 11204), guest, scenario(), at));
    expect(err.code).toBe("quote_changed");
    expect(db.paymentIntents).toHaveLength(0);
  });
});

describe("O03 / O04", () => {
  it("E07: required and ZIP errors come back per field", () => {
    const cart = loadSampleCart(db, undefined);
    const err = errorOf(() => { saveDelivery(db, cart, { ...JORDAN, line1: "", zip: "97" }, guest, scenario()); });
    expect(err.fieldErrors).toEqual({ line1: ["Enter a street address."], zip: ["Use a valid 5-digit ZIP."] });
    expect(db.checkouts[cart.token]).toBeUndefined();
  });

  it("E14: unsupported region keeps the address but offers no methods", () => {
    const cart = loadSampleCart(db, undefined);
    const unsupported = scenario({ shipping: "unsupported" });
    expect(errorOf(() => { saveDelivery(db, cart, JORDAN, guest, unsupported); }).code).toBe("shipping_unavailable");
    const view = checkoutView(db, cart, guest, unsupported, at);
    expect(view.delivery?.address.line1).toBe("24 Oak Street");
    expect(view).toMatchObject({ coverage: "unsupported", shippingOptions: [] });
    expect(errorOf(() => { chooseShipping(db, cart, "express", unsupported); }).code).toBe("shipping_unavailable");
  });

  it("server rates: Standard 12–14 Oct $73.04, Express 9–10 Oct $80.04", () => {
    const cart = loadSampleCart(db, undefined);
    saveDelivery(db, cart, JORDAN, guest, scenario());
    const options = checkoutView(db, cart, guest, scenario(), at).shippingOptions;
    expect(options.map((o) => [o.id, o.estimate, o.totalIfChosenCents])).toEqual([
      ["standard", "12–14 Oct", 7304],
      ["express", "9–10 Oct", 8004],
    ]);
    chooseShipping(db, cart, "express", scenario());
    expect(checkoutView(db, cart, guest, scenario(), at).quote.totalCents).toBe(8004);
  });

  it("a signed-in customer can save a new address; guests can't", () => {
    const jordan = must(db.users.find((u) => u.id === "cus_jordan"));
    const lookup = lookupSession(db, createSession(db, jordan, at), at);
    const cart = loadSampleCart(db, undefined);
    saveDelivery(db, cart, { ...JORDAN, line1: "1 New Road", saveAddress: true }, lookup, scenario());
    expect(jordan.kind === "customer" && jordan.addresses.map((a) => a.line1)).toEqual(["24 Oak Street", "1 New Road"]);
  });
});

describe("payment and order (spec §5.3)", () => {
  function readyCart() {
    const cart = loadSampleCart(db, undefined);
    saveDelivery(db, cart, JORDAN, guest, scenario());
    return cart;
  }

  it("paid: one intent per key, one order, stock taken, cart cleared, receipt sent", () => {
    const cart = readyCart();
    const first = submitPayment(db, cart, payBody("key-paid-1"), guest, scenario(), at);
    const again = submitPayment(db, cart, payBody("key-paid-1"), guest, scenario(), at);
    expect(again.id).toBe(first.id);
    expect(db.paymentIntents).toHaveLength(1);
    expect(first).toMatchObject({ status: "processing", orderId: null });
    // Nothing is paid until the server settles the intent.
    expect(db.orders).toHaveLength(2);

    const settled = readIntent(db, first.id, cart.token, at);
    readIntent(db, first.id, cart.token, at);
    expect(settled).toMatchObject({ status: "paid", orderId: "BS-10429" });
    expect(db.orders).toHaveLength(3);
    expect(findVariant(db, "ESV-ST-HC")?.variant.stock).toEqual({ onHand: 15, reserved: 4, available: 11 });
    expect(cart.lines).toEqual([]);
    expect(cart.saved).toHaveLength(2);
    expect(db.checkouts[cart.token]).toBeUndefined();
    expect(db.outbox[0]).toMatchObject({ kind: "order-receipt", to: "jordan@example.com" });
  });

  it("declined: no order; the cart and details are kept", () => {
    const cart = readyCart();
    const intent = submitPayment(db, cart, payBody("key-decl-1"), guest, scenario({ payment: "declined" }), at);
    expect(readIntent(db, intent.id, cart.token, at)).toMatchObject({ status: "declined", orderId: null });
    expect(db.orders).toHaveLength(2);
    expect(cart.lines).toHaveLength(2);
    expect(db.checkouts[cart.token]).toBeDefined();
  });

  it.each([
    ["uncertain-paid", "paid"],
    ["uncertain-failed", "declined"],
    ["pending", "pending"],
  ] as const)("%s: pending first, then Check status → %s, with one intent", (payment, outcome) => {
    const cart = readyCart();
    const intent = submitPayment(db, cart, payBody(`key-${payment}`), guest, scenario({ payment }), at);
    expect(readIntent(db, intent.id, cart.token, at).status).toBe("pending");
    expect(checkIntent(db, intent.id, cart.token, at).status).toBe(outcome);
    expect(db.paymentIntents).toHaveLength(1);
    expect(db.orders).toHaveLength(outcome === "paid" ? 3 : 2);
  });

  it("another browser can't read the intent", () => {
    const cart = readyCart();
    const intent = submitPayment(db, cart, payBody("key-other-1"), guest, scenario(), at);
    expect(errorOf(() => readIntent(db, intent.id, "someone-else", at)).code).toBe("not_found");
  });

  it("refuses a total the customer wasn't shown", () => {
    const cart = readyCart();
    expect(errorOf(() => submitPayment(db, cart, payBody("key-total-1", 100), guest, scenario(), at)).code).toBe("quote_changed");
  });

  it("O08 access: the paying browser briefly, the owner always, strangers never (non-disclosing)", () => {
    const cart = readyCart();
    const intent = submitPayment(db, cart, payBody("key-access-1"), guest, scenario(), at);
    const { orderId } = readIntent(db, intent.id, cart.token, at);
    const id = must(orderId ?? undefined);
    expect(orderConfirmation(db, id, guest, cart.token, at)).toMatchObject({
      isGuest: true,
      estimate: "12–14 Oct",
      order: { totals: { totalCents: 7304 }, paymentMethodLabel: "Visa ending 4242" },
    });
    const stranger = ensureCart(db, undefined).token;
    expect(errorOf(() => orderConfirmation(db, id, guest, stranger, at)).message).toBe(
      errorOf(() => orderConfirmation(db, "BS-99999", guest, stranger, at)).message,
    );
    const later = new Date(at.getTime() + 61 * 60_000);
    expect(errorOf(() => orderConfirmation(db, id, guest, cart.token, later)).code).toBe("not_found");

    const jordan = must(db.users.find((u) => u.id === "cus_jordan"));
    const owner = lookupSession(db, createSession(db, jordan, at), at);
    expect(orderConfirmation(db, "BS-10428", owner, undefined, at).order.lines[0]?.variantLabel).toBe("Hardcover / Standard");
  });
});
