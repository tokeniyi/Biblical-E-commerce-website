// DELETE-ME-LATER: a customer's reviews (A13). Only delivered purchases can
// be reviewed, once per product; new reviews and edits wait for moderation
// and are not public on C06 until approved (spec §2, §5.11).
import {
  ReviewInputSchema,
  variantShortLabel,
  type MyReviews,
  type Order,
  type Product,
  type Review,
  type ReviewFormView,
} from "@your-app/shared";
import type { Scenario } from "@/lib/dev/scenario-defs";
import { MockApiError } from "../http";
import { nextId } from "../store";
import type { CustomerRecord, Db } from "../types";
import { findVariant } from "./catalog";
import { zodFieldErrors } from "./identity";
import { customerOrders, orderStatus, ownOrder } from "./orders";

function productOf(db: Db, sku: string): Product | null {
  return findVariant(db, sku)?.product ?? null;
}

function reviewFor(db: Db, customerId: string, productSlug: string): Review | undefined {
  return db.reviews.find((r) => r.customerId === customerId && r.productSlug === productSlug);
}

/** Delivered lines of this order whose product the customer hasn't reviewed yet. */
export function reviewableLines(db: Db, customerId: string, order: Order): Order["lines"] {
  if (orderStatus(order) !== "delivered") return [];
  return order.lines.filter((line) => {
    const product = productOf(db, line.sku);
    return product !== null && !reviewFor(db, customerId, product.slug);
  });
}

/**
 * Keeps the stored rating summary (C05/C06) in step when a review becomes
 * public or stops being public. The stored average is the starting point,
 * so the seeded 4.8 only moves by what actually changed.
 */
export function adjustRating(db: Db, productSlug: string, rating: number, delta: 1 | -1): void {
  const product = db.products.find((p) => p.slug === productSlug);
  if (!product) return;
  const current = product.rating ?? { average: 0, count: 0, histogram: [0, 0, 0, 0, 0] };
  const count = current.count + delta;
  if (count <= 0) {
    product.rating = null;
    return;
  }
  const histogram = current.histogram.map((n, i) => (i === 5 - rating ? Math.max(0, n + delta) : n)) as typeof current.histogram;
  const average = Math.round(((current.average * current.count + delta * rating) / count) * 10) / 10;
  product.rating = { average, count, histogram };
}

/** A13 list: every review of the customer's, whatever its status, plus what is waiting for one. */
export function myReviews(db: Db, customerId: string, scenario: Pick<Scenario, "order">): MyReviews {
  const reviews = db.reviews
    .filter((r) => r.customerId === customerId)
    .map((r) => ({
      id: r.id,
      productSlug: r.productSlug,
      productName: db.products.find((p) => p.slug === r.productSlug)?.name ?? r.productSlug,
      sku: r.sku,
      orderId: r.orderId ?? null,
      rating: r.rating,
      title: r.title,
      status: r.status,
    }));
  const seen = new Set<string>();
  const awaiting = customerOrders(db, customerId, scenario).flatMap((order) =>
    reviewableLines(db, customerId, order).flatMap((line) => {
      const slug = productOf(db, line.sku)?.slug ?? line.sku;
      if (seen.has(slug)) return [];
      seen.add(slug);
      return [{ orderId: order.id, sku: line.sku, productName: line.productName, deliveredAt: order.deliveredAt ?? order.placedAt }];
    }),
  );
  return { reviews, awaiting };
}

/** A13 write/edit route: eligibility comes from the order, never from the URL alone. */
export function reviewForm(db: Db, customerId: string, orderId: string, sku: string, scenario: Pick<Scenario, "order">): ReviewFormView {
  const order = ownOrder(db, customerId, orderId, scenario);
  const line = order.lines.find((l) => l.sku === sku);
  const found = findVariant(db, sku);
  if (!line || !found) {
    return { status: "ineligible", reason: "not-purchased", orderId, productSlug: found?.product.slug ?? null, productName: found?.product.name ?? null };
  }
  if (orderStatus(order) !== "delivered") {
    return { status: "ineligible", reason: "not-delivered", orderId, productSlug: found.product.slug, productName: found.product.name };
  }
  const existing = reviewFor(db, customerId, found.product.slug);
  return {
    status: "eligible",
    item: {
      orderId,
      sku,
      productName: line.productName,
      productSlug: found.product.slug,
      variantLabel: variantShortLabel(found.variant),
      deliveredAt: order.deliveredAt ?? order.placedAt,
    },
    existing: existing
      ? {
          id: existing.id,
          productSlug: existing.productSlug,
          productName: found.product.name,
          sku: existing.sku,
          orderId: existing.orderId ?? null,
          rating: existing.rating,
          title: existing.title,
          body: existing.body,
          status: existing.status,
        }
      : null,
  };
}

/** "Jordan L.": first name and last initial, as on the drawn reviews. */
function authorName(user: CustomerRecord): string {
  const initial = user.lastName.trim().charAt(0);
  return initial ? `${user.firstName} ${initial}.` : user.firstName;
}

/**
 * A13 submit (new or edit). Eligibility is checked again here. The review
 * is pending either way: an edit of a published review leaves C06 until
 * it is approved again.
 */
export function submitReview(
  db: Db,
  user: CustomerRecord,
  orderId: string,
  sku: string,
  body: unknown,
  scenario: Pick<Scenario, "order">,
  at: Date,
): Review {
  const form = reviewForm(db, user.id, orderId, sku, scenario);
  if (form.status !== "eligible") {
    throw new MockApiError("forbidden", "You can review an item after it’s delivered.");
  }
  const parsed = ReviewInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const existing = db.reviews.find((r) => r.id === form.existing?.id);
  if (existing) {
    if (existing.status === "published") adjustRating(db, existing.productSlug, existing.rating, -1);
    Object.assign(existing, parsed.data, { status: "pending", sku, orderId });
    return existing;
  }
  const review: Review = {
    ...parsed.data,
    id: nextId(db, "rev"),
    productSlug: form.item.productSlug,
    sku,
    authorName: authorName(user),
    customerId: user.id,
    verifiedPurchase: true,
    status: "pending",
    helpfulCount: 0,
    orderId,
    createdAt: at.toISOString(),
  };
  db.reviews.push(review);
  return review;
}

/** A13 delete (after the confirm dialog). Only the author's own review; a published one leaves C06. */
export function deleteReview(db: Db, customerId: string, id: string): void {
  const review = db.reviews.find((r) => r.id === id && r.customerId === customerId);
  if (!review) throw new MockApiError("not_found", "We couldn’t find that review.");
  if (review.status === "published") adjustRating(db, review.productSlug, review.rating, -1);
  db.reviews = db.reviews.filter((r) => r !== review);
}
