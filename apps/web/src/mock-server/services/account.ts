// DELETE-ME-LATER: customer sign-in, registration, order history and the
// wishlist view (A01, A02, A07, A10, A11, A12).
import {
  variantLongLabel,
  type LoginInput,
  type OrderSummary,
  type RegisterInput,
  type WishlistItem,
  type Order,
} from "@your-app/shared";
import { MockApiError } from "../http";
import { sendEmail } from "../outbox";
import { nextId } from "../store";
import type { CustomerRecord, Db, UserRecord } from "../types";
import { createSession } from "./auth";
import { findVariant } from "./catalog";

const GENERIC_LOGIN_ERROR = "That email and password don’t match an account.";

/**
 * Generic failure for unknown email, wrong password or wrong audience, so
 * the response never reveals whether an account exists (spec §5.6).
 */
export function signIn(db: Db, input: LoginInput, at: Date): { user: UserRecord; sessionId: string } {
  const email = input.email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  const audienceOk = user && (input.audience === "staff" ? user.kind === "staff" : user.kind === "customer");
  if (!user || !audienceOk || user.password !== input.password) {
    throw new MockApiError("invalid_credentials", GENERIC_LOGIN_ERROR);
  }
  return { user, sessionId: createSession(db, user, at) };
}

export function register(db: Db, input: RegisterInput, at: Date): { user: CustomerRecord; sessionId: string } {
  const email = input.email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw new MockApiError("validation_failed", "Check the highlighted field.", {
      email: ["An account may already use this email. Sign in or reset your password instead."],
    });
  }
  const user: CustomerRecord = {
    kind: "customer",
    id: nextId(db, "cus"),
    email,
    name: input.name.trim(),
    emailVerified: false,
    password: input.password,
    marketingOptIn: input.marketingOptIn,
    addresses: [],
  };
  db.users.push(user);
  const token = nextId(db, "vrf");
  sendEmail(db, {
    kind: "verify-email",
    to: email,
    subject: "Verify your email",
    body: `Welcome, ${user.name}. Confirm your email address to finish setting up your account.`,
    link: `/verify-email?token=${token}`,
    code: null,
  }, at);
  return { user, sessionId: createSession(db, user, at) };
}

export function orderSummary(order: Order): OrderSummary {
  const first = order.lines.at(0);
  return {
    id: order.id,
    placedAt: order.placedAt,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    deliveredAt: order.deliveredAt,
    totalCents: order.totals.totalCents,
    itemCount: order.lines.reduce((n, l) => n + l.quantity, 0),
    firstLine: first ? { productName: first.productName, variantLabel: first.variantLabel } : null,
  };
}

/** A10: newest first, only the signed-in customer's own orders. */
export function customerOrders(db: Db, customerId: string): OrderSummary[] {
  return db.orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map(orderSummary);
}

/** A11: unknown and someone else's order look the same (not_found). */
export function customerOrder(db: Db, customerId: string, orderId: string): Order {
  const order = db.orders.find((o) => o.id === orderId && o.customerId === customerId);
  if (!order) throw new MockApiError("not_found", "We couldn’t find that order.");
  return order;
}

/** A12 rows; editions that were unpublished since saving are dropped. */
export function wishlistItems(db: Db, customerId: string): WishlistItem[] {
  return (db.wishlists[customerId] ?? []).flatMap((sku) => {
    const found = findVariant(db, sku);
    if (!found || found.variant.status !== "published" || found.product.status !== "published") return [];
    const { product, variant } = found;
    return [
      {
        sku,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: variantLongLabel(variant),
        translation: variant.translation,
        binding: variant.binding,
        priceCents: variant.priceCents,
        available: variant.stock.available,
      },
    ];
  });
}

export function removeFromWishlist(db: Db, customerId: string, sku: string): void {
  db.wishlists[customerId] = (db.wishlists[customerId] ?? []).filter((s) => s !== sku);
}
