// DELETE-ME-LATER: anonymous cart + saved-for-later (C05→C07, C08).
// Prices here are what the customer saw; Phase 2's quote is authoritative.
import {
  variantShortLabel,
  type AddToCartInput,
  type Cart,
  type CartMutationResponse,
  type CartView,
} from "@your-app/shared";
import { MockApiError } from "../http";
import type { CartRecord, Db } from "../types";
import { CART_COOKIE } from "./auth";
import { findVariant, isPurchasable } from "./catalog";

export function findCart(db: Db, token: string | undefined): CartRecord | undefined {
  return token ? db.carts.find((c) => c.token === token) : undefined;
}

/** Returns the cart for this token, creating one (with a new unguessable token) if needed. */
export function ensureCart(db: Db, token: string | undefined): CartRecord {
  const existing = findCart(db, token);
  if (existing) return existing;
  const cart: CartRecord = {
    token: crypto.randomUUID(),
    lines: [],
    saved: [],
    promoCode: null,
    customerId: null,
    mergeConflicts: [],
  };
  db.carts.push(cart);
  return cart;
}

export function cartView(db: Db, cart: Cart | CartRecord | undefined): CartView {
  if (!cart) return { lines: [], saved: [], itemCount: 0, subtotalCents: 0, mergeConflicts: [] };
  const lines = cart.lines.flatMap((line) => {
    const found = findVariant(db, line.sku);
    if (!found) return [];
    return [
      {
        ...line,
        productSlug: found.product.slug,
        productName: found.product.name,
        variantLabel: variantShortLabel(found.variant),
        lineTotalCents: line.unitPriceCents * line.quantity,
        available: found.variant.stock.available,
      },
    ];
  });
  const saved = cart.saved.flatMap(({ sku }) => {
    const found = findVariant(db, sku);
    if (!found) return [];
    return [
      {
        sku,
        productSlug: found.product.slug,
        productName: found.product.name,
        binding: found.variant.binding,
        categorySlug: found.product.categorySlugs[0] ?? null,
        // Current catalog price and stock, rechecked on every read (C08).
        priceCents: found.variant.priceCents,
        available: isPurchasable(found) ? found.variant.stock.available : 0,
      },
    ];
  });
  const conflicts = "mergeConflicts" in cart ? cart.mergeConflicts : [];
  const mergeConflicts = conflicts.flatMap((conflict) => {
    const line = lines.find((l) => l.sku === conflict.sku);
    return line ? [{ ...conflict, productName: line.productName }] : [];
  });
  return {
    lines,
    saved,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    mergeConflicts,
  };
}

/**
 * Adds a variant, merging with an existing line. The server enforces
 * min 1 and max = available, counting what is already in the cart (C05).
 */
export function addLine(db: Db, cart: Cart, input: AddToCartInput): void {
  const found = findVariant(db, input.sku);
  if (!isPurchasable(found)) {
    throw new MockApiError("variant_unavailable", "This edition isn’t available to buy.");
  }
  const { variant, product } = found;
  if (variant.stock.available <= 0) {
    throw new MockApiError("out_of_stock", `${product.name} is out of stock.`);
  }
  const existing = cart.lines.find((l) => l.sku === input.sku);
  const inCart = existing?.quantity ?? 0;
  const room = variant.stock.available - inCart;
  if (input.quantity > room) {
    const message =
      inCart > 0
        ? `Only ${String(variant.stock.available)} available, and ${String(inCart)} already in your cart.`
        : `Only ${String(variant.stock.available)} available.`;
    throw new MockApiError("validation_failed", message, { quantity: [message] }, { available: variant.stock.available, inCart });
  }
  if (existing) {
    existing.quantity += input.quantity;
    existing.unitPriceCents = variant.priceCents;
  } else {
    cart.lines.push({ sku: input.sku, quantity: input.quantity, unitPriceCents: variant.priceCents });
  }
}

export function addToCart(db: Db, cart: Cart, input: AddToCartInput): CartMutationResponse {
  addLine(db, cart, input);
  return { cart: cartView(db, cart), added: { sku: input.sku, quantity: input.quantity } };
}

function requireSaved(cart: CartRecord | undefined, sku: string): CartRecord {
  if (!cart?.saved.some((s) => s.sku === sku)) {
    throw new MockApiError("not_found", "That item isn’t in your saved items.");
  }
  return cart;
}

/**
 * C08 "Move to cart": rechecks stock and the current price. If it can't be
 * added, the item stays saved and the error explains why (E05).
 */
export function moveSavedToCart(db: Db, token: string | undefined, sku: string): CartMutationResponse {
  const cart = requireSaved(findCart(db, token), sku);
  addLine(db, cart, { sku, quantity: 1 });
  cart.saved = cart.saved.filter((s) => s.sku !== sku);
  return { cart: cartView(db, cart), added: { sku, quantity: 1 } };
}

export function removeSaved(db: Db, token: string | undefined, sku: string): CartView {
  const cart = requireSaved(findCart(db, token), sku);
  cart.saved = cart.saved.filter((s) => s.sku !== sku);
  return cartView(db, cart);
}

/**
 * Dev toolbar "Load sample cart": the state drawn across the frames
 * ("Cart (2)": ESV + NIV, as in C07) with KJV large print and the sold-out
 * NLT saved for later (C08).
 */
export function loadSampleCart(db: Db, token: string | undefined): CartRecord {
  const cart = ensureCart(db, token);
  cart.lines = [
    { sku: "ESV-ST-HC", quantity: 1, unitPriceCents: 3900 },
    { sku: "NIV-EV-PB", quantity: 1, unitPriceCents: 2400 },
  ];
  cart.saved = [{ sku: "KJV-LP-LL" }, { sku: "NLT-CH-HC" }];
  cart.promoCode = null;
  cart.mergeConflicts = [];
  return cart;
}

/** httpOnly so page scripts can't read it; survives logout (A14). */
export function setCartCookie(response: { cookies: { set: (name: string, value: string, options: object) => unknown } }, token: string): void {
  response.cookies.set(CART_COOKIE, token, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
}

function requireLine(cart: CartRecord | undefined, sku: string): CartRecord {
  if (!cart?.lines.some((l) => l.sku === sku)) {
    throw new MockApiError("not_found", "That item isn’t in your cart.");
  }
  return cart;
}

/**
 * O01 quantity stepper: min 1, max = available. Zero is refused; removing
 * is an explicit action. The line keeps the price the customer saw, so a
 * price change still surfaces as E06.
 */
export function updateLineQuantity(db: Db, token: string | undefined, sku: string, quantity: number): CartView {
  const cart = requireLine(findCart(db, token), sku);
  if (!Number.isInteger(quantity) || quantity < 1) {
    const message = "Quantity must be at least 1. Use Remove to take it out of your cart.";
    throw new MockApiError("validation_failed", message, { quantity: [message] });
  }
  const found = findVariant(db, sku);
  const available = isPurchasable(found) ? found.variant.stock.available : 0;
  if (quantity > available) {
    const message = `Only ${String(available)} available.`;
    throw new MockApiError("validation_failed", message, { quantity: [message] }, { available });
  }
  const line = cart.lines.find((l) => l.sku === sku);
  if (line) line.quantity = quantity;
  clearConflict(cart, sku);
  return cartView(db, cart);
}

/** O01 "Remove" (after the confirm dialog) and E06 "Remove affected item". */
export function removeLine(db: Db, token: string | undefined, sku: string): CartView {
  const cart = requireLine(findCart(db, token), sku);
  cart.lines = cart.lines.filter((l) => l.sku !== sku);
  clearConflict(cart, sku);
  return cartView(db, cart);
}

/** O01 "Save → C08": moves the line out of the totals into saved for later. */
export function saveLineForLater(db: Db, token: string | undefined, sku: string): CartView {
  const cart = requireLine(findCart(db, token), sku);
  cart.lines = cart.lines.filter((l) => l.sku !== sku);
  if (!cart.saved.some((s) => s.sku === sku)) cart.saved.push({ sku });
  return cartView(db, cart);
}

/** Any explicit quantity choice on O01 settles a sign-in merge conflict for that line. */
function clearConflict(cart: CartRecord, sku: string): void {
  cart.mergeConflicts = cart.mergeConflicts.filter((c) => c.sku !== sku);
}

function isEmpty(cart: Cart): boolean {
  return cart.lines.length === 0 && cart.saved.length === 0;
}

/**
 * Sign-in (spec §5.1): the browser's anonymous cart joins the customer's
 * account cart. Editions in both are deduped by SKU; when quantities differ
 * the quantity from this visit is kept and the difference is recorded for
 * the customer to settle on O01. Quantities are never added together.
 * Returns the cart the browser should use from now on (its token goes in
 * the cookie), or undefined when there is none yet.
 */
export function mergeCartOnSignIn(db: Db, browserToken: string | undefined, customerId: string): CartRecord | undefined {
  const browser = findCart(db, browserToken);
  const account = db.carts.find((c) => c.customerId === customerId && c !== browser);

  // Another customer's cart left on a shared browser is theirs: never merged.
  if (browser?.customerId && browser.customerId !== customerId) return account;
  if (!account) {
    if (browser) browser.customerId = customerId;
    return browser;
  }
  if (!browser || isEmpty(browser)) {
    if (browser) db.carts = db.carts.filter((c) => c !== browser);
    return account;
  }

  const conflicts: CartRecord["mergeConflicts"] = [];
  for (const line of browser.lines) {
    const existing = account.lines.find((l) => l.sku === line.sku);
    if (!existing) {
      account.lines.push({ ...line });
      continue;
    }
    if (existing.quantity !== line.quantity) {
      conflicts.push({ sku: line.sku, keptQuantity: line.quantity, accountQuantity: existing.quantity });
      existing.quantity = line.quantity;
    }
    existing.unitPriceCents = line.unitPriceCents;
  }
  for (const item of browser.saved) {
    if (!account.saved.some((s) => s.sku === item.sku)) account.saved.push({ ...item });
  }
  account.promoCode = browser.promoCode ?? account.promoCode;
  account.mergeConflicts = conflicts;
  // Checkout progress made before signing in (O03) carries over.
  const draft = db.checkouts[browser.token];
  if (draft && !db.checkouts[account.token]) db.checkouts[account.token] = draft;
  db.checkouts[browser.token] = undefined;
  db.carts = db.carts.filter((c) => c !== browser);
  return account;
}

/** O01 merge prompt: keep this visit's quantity, or use the account cart's (stock-checked). */
export function resolveMergeConflict(db: Db, token: string | undefined, sku: string, use: "kept" | "account"): CartView {
  const cart = requireLine(findCart(db, token), sku);
  const conflict = cart.mergeConflicts.find((c) => c.sku === sku);
  if (!conflict) return cartView(db, cart);
  if (use === "account") return updateLineQuantity(db, token, sku, conflict.accountQuantity);
  clearConflict(cart, sku);
  return cartView(db, cart);
}
