import { beforeEach, describe, expect, it } from "vitest";
import { MockApiError } from "../http";
import { addToCart, cartView, ensureCart, findCart, loadSampleCart, moveSavedToCart, removeSaved } from "../services/cart";
import { findVariant } from "../services/catalog";
import { addToWishlist, getWishlist } from "../services/wishlist";
import { resetDb } from "../store";
import type { Db } from "../types";

let db: Db;
beforeEach(() => {
  db = resetDb();
});

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof MockApiError) return error.code;
    throw error;
  }
  return "none";
}

describe("add to cart (C05 → C07)", () => {
  it("creates a cart with an unguessable token and adds the line at the current price", () => {
    const cart = ensureCart(db, undefined);
    expect(cart.token).toMatch(/^[0-9a-f-]{36}$/);
    const res = addToCart(db, cart, { sku: "ESV-ST-HC", quantity: 1 });
    expect(res.added).toEqual({ sku: "ESV-ST-HC", quantity: 1 });
    expect(res.cart.lines).toEqual([
      expect.objectContaining({
        sku: "ESV-ST-HC",
        productName: "ESV Study Bible",
        variantLabel: "Hardcover / Standard",
        quantity: 1,
        unitPriceCents: 3900,
        lineTotalCents: 3900,
        available: 12,
      }),
    ]);
  });

  it("C07: NIV in the cart, add ESV → 2 items, subtotal $63.00", () => {
    const cart = ensureCart(db, undefined);
    addToCart(db, cart, { sku: "NIV-EV-PB", quantity: 1 });
    const res = addToCart(db, cart, { sku: "ESV-ST-HC", quantity: 1 });
    expect(res.cart.itemCount).toBe(2);
    expect(res.cart.subtotalCents).toBe(6300);
  });

  it("the sample cart is the drawn state: Cart (2), $63.00", () => {
    expect(cartView(db, loadSampleCart(db, undefined))).toMatchObject({ itemCount: 2, subtotalCents: 6300 });
  });

  it("merges repeat adds into one line", () => {
    const cart = ensureCart(db, undefined);
    addToCart(db, cart, { sku: "NIV-EV-PB", quantity: 2 });
    const res = addToCart(db, cart, { sku: "NIV-EV-PB", quantity: 3 });
    expect(res.cart.lines).toHaveLength(1);
    expect(res.cart.lines[0]?.quantity).toBe(5);
  });

  it("rejects more than available, counting what is already in the cart", () => {
    const cart = ensureCart(db, undefined);
    expect(errorCode(() => addToCart(db, cart, { sku: "ESV-ST-HC", quantity: 13 }))).toBe("validation_failed");
    addToCart(db, cart, { sku: "ESV-ST-HC", quantity: 10 });
    expect(errorCode(() => addToCart(db, cart, { sku: "ESV-ST-HC", quantity: 3 }))).toBe("validation_failed");
    expect(errorCode(() => addToCart(db, cart, { sku: "ESV-ST-HC", quantity: 2 }))).toBe("none");
    expect(findCart(db, cart.token)?.lines[0]?.quantity).toBe(12);
  });

  it("E05: sold out is refused by the server even if the UI were bypassed", () => {
    expect(errorCode(() => addToCart(db, ensureCart(db, undefined), { sku: "NLT-CH-HC", quantity: 1 }))).toBe("out_of_stock");
  });

  it("E12: a draft variant or unknown SKU cannot be bought", () => {
    const cart = ensureCart(db, undefined);
    expect(errorCode(() => addToCart(db, cart, { sku: "ESV-ST-LL-LP", quantity: 1 }))).toBe("variant_unavailable");
    expect(errorCode(() => addToCart(db, cart, { sku: "NOPE", quantity: 1 }))).toBe("variant_unavailable");
    expect(cart.lines).toEqual([]);
  });

  it("an empty or unknown cart reads as empty", () => {
    expect(cartView(db, findCart(db, "missing"))).toEqual({ lines: [], saved: [], itemCount: 0, subtotalCents: 0, mergeConflicts: [] });
  });
});

describe("saved for later (C08)", () => {
  it("shows current price and stock for saved items", () => {
    const cart = loadSampleCart(db, undefined);
    expect(cartView(db, cart).saved).toEqual([
      { sku: "KJV-LP-LL", productSlug: "kjv-large-print-bible", productName: "KJV Large Print Bible", binding: "Leather-look", categorySlug: "devotional", priceCents: 3200, available: 8 },
      { sku: "NLT-CH-HC", productSlug: "nlt-childrens-bible", productName: "NLT Children’s Bible", binding: "Hardcover", categorySlug: "children", priceCents: 2200, available: 0 },
    ]);
  });

  it("move to cart rechecks the current price", () => {
    const cart = loadSampleCart(db, undefined);
    const kjv = findVariant(db, "KJV-LP-LL")?.variant;
    if (kjv) kjv.priceCents = 3400;
    const res = moveSavedToCart(db, cart.token, "KJV-LP-LL");
    expect(res.cart.lines.find((l) => l.sku === "KJV-LP-LL")?.unitPriceCents).toBe(3400);
    expect(res.cart.saved.map((s) => s.sku)).toEqual(["NLT-CH-HC"]);
    expect(res.added).toEqual({ sku: "KJV-LP-LL", quantity: 1 });
  });

  it("E05: an out-of-stock item stays saved when moving fails", () => {
    const cart = loadSampleCart(db, undefined);
    expect(errorCode(() => moveSavedToCart(db, cart.token, "NLT-CH-HC"))).toBe("out_of_stock");
    expect(cart.saved.map((s) => s.sku)).toEqual(["KJV-LP-LL", "NLT-CH-HC"]);
    expect(cart.lines.map((l) => l.sku)).toEqual(["ESV-ST-HC", "NIV-EV-PB"]);
  });

  it("stock that drops after the page loaded is caught on move", () => {
    const cart = loadSampleCart(db, undefined);
    const kjv = findVariant(db, "KJV-LP-LL")?.variant;
    if (kjv) kjv.stock = { onHand: 1, reserved: 1, available: 0 };
    expect(errorCode(() => moveSavedToCart(db, cart.token, "KJV-LP-LL"))).toBe("out_of_stock");
    expect(cart.saved.map((s) => s.sku)).toContain("KJV-LP-LL");
  });

  it("remove deletes only the saved item, never cart lines", () => {
    const cart = loadSampleCart(db, undefined);
    const view = removeSaved(db, cart.token, "KJV-LP-LL");
    expect(view.saved.map((s) => s.sku)).toEqual(["NLT-CH-HC"]);
    expect(view.lines.map((l) => l.sku)).toEqual(["ESV-ST-HC", "NIV-EV-PB"]);
  });

  it("a saved item from another cart is not found", () => {
    loadSampleCart(db, undefined);
    expect(errorCode(() => removeSaved(db, "someone-else", "KJV-LP-LL"))).toBe("not_found");
    expect(errorCode(() => moveSavedToCart(db, undefined, "KJV-LP-LL"))).toBe("not_found");
  });
});

describe("wishlist", () => {
  it("is idempotent per SKU", () => {
    // Sam starts with an empty wishlist (Jordan's is seeded as drawn in A12).
    addToWishlist(db, "cus_sam", "ESV-ST-HC");
    addToWishlist(db, "cus_sam", "ESV-ST-HC");
    expect(getWishlist(db, "cus_sam")).toEqual({ skus: ["ESV-ST-HC"] });
  });

  it("E05: sold-out editions can still be saved; drafts cannot", () => {
    expect(addToWishlist(db, "cus_jordan", "NLT-CH-HC").skus).toContain("NLT-CH-HC");
    expect(errorCode(() => addToWishlist(db, "cus_jordan", "ESV-ST-LL-LP"))).toBe("variant_unavailable");
  });

  it("is per customer", () => {
    addToWishlist(db, "cus_jordan", "ESV-ST-HC");
    expect(getWishlist(db, "cus_sam")).toEqual({ skus: [] });
  });
});
