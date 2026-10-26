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
import type { Db } from "../types";
import { CART_COOKIE } from "./auth";
import { findVariant, isPurchasable } from "./catalog";

export function findCart(db: Db, token: string | undefined): Cart | undefined {
  return token ? db.carts.find((c) => c.token === token) : undefined;
}

/** Returns the cart for this token, creating one (with a new unguessable token) if needed. */
export function ensureCart(db: Db, token: string | undefined): Cart {
  const existing = findCart(db, token);
  if (existing) return existing;
  const cart: Cart = { token: crypto.randomUUID(), lines: [], saved: [], promoCode: null };
  db.carts.push(cart);
  return cart;
}

export function cartView(db: Db, cart: Cart | undefined): CartView {
  if (!cart) return { lines: [], saved: [], itemCount: 0, subtotalCents: 0 };
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
  return {
    lines,
    saved,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
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

function requireSaved(cart: Cart | undefined, sku: string): Cart {
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
 * Dev toolbar "Load sample cart": the state drawn in C07/C08 (NIV in the
 * cart; KJV large print and the sold-out NLT saved for later).
 */
export function loadSampleCart(db: Db, token: string | undefined): Cart {
  const cart = ensureCart(db, token);
  cart.lines = [{ sku: "NIV-EV-PB", quantity: 1, unitPriceCents: 2400 }];
  cart.saved = [{ sku: "KJV-LP-LL" }, { sku: "NLT-CH-HC" }];
  cart.promoCode = null;
  return cart;
}

/** httpOnly so page scripts can't read it; survives logout (A14). */
export function setCartCookie(response: { cookies: { set: (name: string, value: string, options: object) => unknown } }, token: string): void {
  response.cookies.set(CART_COOKIE, token, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
}
