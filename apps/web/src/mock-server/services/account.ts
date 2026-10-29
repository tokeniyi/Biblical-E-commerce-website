// DELETE-ME-LATER: the signed-in customer's own data (A07–A09, A12).
// Every function takes the session's user id; nothing here trusts an id
// from the URL without checking it belongs to that customer.
import {
  ProfileInputSchema,
  SavedAddressInputSchema,
  stateName,
  variantLongLabel,
  type AccountOverview,
  type Address,
  type AddressBook,
  type Profile,
  type ProfileUpdateResult,
  type WishlistItems,
} from "@your-app/shared";
import type { Scenario } from "@/lib/dev/scenario-defs";
import { MockApiError } from "../http";
import { nextId } from "../store";
import type { CustomerRecord, Db } from "../types";
import { requireCustomer, type SessionLookup } from "./auth";
import { findVariant, isPurchasable } from "./catalog";
import { findCustomerByEmail, sendVerification, zodFieldErrors } from "./identity";
import { customerOrders, orderStatus } from "./orders";
import { myReviews } from "./reviews";

/** The customer behind an active session; E11 / A14 otherwise. */
export function currentCustomer(db: Db, viewer: SessionLookup): CustomerRecord {
  const session = requireCustomer(viewer);
  const user = db.users.find((u): u is CustomerRecord => u.id === session.userId && u.kind === "customer");
  if (!user) throw new MockApiError("unauthenticated", "Sign in to continue.");
  return user;
}

// --- A07 ---

export function accountOverview(db: Db, user: CustomerRecord, scenario: Scenario): AccountOverview {
  const defaultAddress = user.addresses.find((a) => a.isDefault) ?? user.addresses.at(0);
  const orders = customerOrders(db, user.id, scenario);
  const latest = orders.at(0);
  const reviews = myReviews(db, user.id, scenario);
  return {
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    addresses: {
      count: user.addresses.length,
      defaultPlace: defaultAddress ? `${defaultAddress.city}, ${stateName(defaultAddress.state)}` : null,
    },
    orders: {
      count: orders.length,
      processing: orders.filter((o) => orderStatus(o) === "processing").length,
      latest: latest
        ? { id: latest.id, totalCents: latest.totals.totalCents, placedAt: latest.placedAt, status: orderStatus(latest) }
        : null,
    },
    wishlistCount: (db.wishlists[user.id] ?? []).length,
    reviewCount: reviews.reviews.length,
    awaitingReviewCount: reviews.awaiting.length,
  };
}

// --- A08 ---

export function profileOf(user: CustomerRecord): Profile {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    emailVerified: user.emailVerified,
    phone: user.phone,
    marketingOptIn: user.marketingOptIn,
  };
}

/**
 * A08 save. A new email is unverified until its link is opened (A03).
 * Past orders keep the contact details they were placed with.
 */
export function updateProfile(db: Db, user: CustomerRecord, body: unknown, at: Date): ProfileUpdateResult {
  const parsed = ProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const input = parsed.data;
  const emailChanged = input.email.toLowerCase() !== user.email.toLowerCase();
  if (emailChanged) {
    const taken = findCustomerByEmail(db, input.email) ?? db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (taken) {
      throw new MockApiError("validation_failed", "Check the highlighted fields.", { email: ["Use a different email address."] });
    }
  }
  user.firstName = input.firstName;
  user.lastName = input.lastName;
  user.name = `${input.firstName} ${input.lastName}`;
  user.phone = input.phone ? input.phone : null;
  user.marketingOptIn = input.marketingOptIn;
  if (emailChanged) {
    user.email = input.email;
    user.emailVerified = false;
    sendVerification(db, user, at, { returnTo: "/account/profile" });
  }
  return { profile: profileOf(user), verificationSentTo: emailChanged ? user.email : null };
}

// --- A09 ---

export function addressBook(user: CustomerRecord): AddressBook {
  return { addresses: [...user.addresses] };
}

export function findAddress(user: CustomerRecord, id: string): Address {
  const address = user.addresses.find((a) => a.id === id);
  if (!address) throw new MockApiError("not_found", "We can’t find that address.");
  return address;
}

function parseAddress(body: unknown) {
  const parsed = SavedAddressInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const { isDefault, line2, phone, ...rest } = parsed.data;
  return { isDefault, fields: { ...rest, ...(line2 ? { line2 } : {}), ...(phone ? { phone } : {}) } };
}

function makeDefault(user: CustomerRecord, id: string): void {
  for (const a of user.addresses) a.isDefault = a.id === id;
}

/** The first address is the default; a default only affects future checkouts. */
export function addAddress(db: Db, user: CustomerRecord, body: unknown): Address {
  const { isDefault, fields } = parseAddress(body);
  const address: Address = { ...fields, id: nextId(db, "adr"), isDefault: false };
  user.addresses.push(address);
  if (isDefault || user.addresses.length === 1) makeDefault(user, address.id);
  return address;
}

export function updateAddress(user: CustomerRecord, id: string, body: unknown): Address {
  const existing = findAddress(user, id);
  const { isDefault, fields } = parseAddress(body);
  const updated: Address = { ...fields, id, isDefault: existing.isDefault };
  user.addresses = user.addresses.map((a) => (a.id === id ? updated : a));
  if (isDefault) makeDefault(user, id);
  return updated;
}

/** Orders keep their own address snapshot, so deleting never touches them. */
export function deleteAddress(user: CustomerRecord, id: string): void {
  const existing = findAddress(user, id);
  user.addresses = user.addresses.filter((a) => a.id !== id);
  const next = user.addresses.at(0);
  if (existing.isDefault && next) makeDefault(user, next.id);
}

// --- A12 ---

/** Saved editions with the current price and stock, read fresh every time. */
export function wishlistItems(db: Db, customerId: string): WishlistItems {
  const items = (db.wishlists[customerId] ?? []).flatMap((sku) => {
    const found = findVariant(db, sku);
    if (!found) return [];
    const { product, variant } = found;
    const purchasable = isPurchasable(found);
    return [
      {
        sku,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: variantLongLabel(variant),
        binding: variant.binding,
        priceCents: variant.priceCents,
        available: purchasable ? variant.stock.available : 0,
        purchasable,
        categorySlug: product.categorySlugs[0] ?? null,
      },
    ];
  });
  return { items };
}

/** A12 "Remove from wishlist" (after the confirm dialog). Removing twice is harmless. */
export function removeFromWishlist(db: Db, customerId: string, sku: string): WishlistItems {
  db.wishlists[customerId] = (db.wishlists[customerId] ?? []).filter((s) => s !== sku);
  return wishlistItems(db, customerId);
}
