// DELETE-ME-LATER: customer wishlist keyed by variant SKU (A12).
import type { Wishlist } from "@your-app/shared";
import { MockApiError } from "../http";
import type { Db } from "../types";
import { findVariant, isPurchasable } from "./catalog";

export function getWishlist(db: Db, customerId: string): Wishlist {
  return { skus: [...(db.wishlists[customerId] ?? [])] };
}

/**
 * Idempotent: saving a SKU twice keeps one entry. Sold-out editions can be
 * saved (E05); drafts and unknown SKUs cannot.
 */
export function addToWishlist(db: Db, customerId: string, sku: string): Wishlist {
  if (!isPurchasable(findVariant(db, sku))) {
    throw new MockApiError("variant_unavailable", "This edition isn’t available.");
  }
  const skus = db.wishlists[customerId] ?? [];
  if (!skus.includes(sku)) skus.push(sku);
  db.wishlists[customerId] = skus;
  return getWishlist(db, customerId);
}
