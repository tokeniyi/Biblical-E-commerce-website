/**
 * Proposed business rules from the wireframes (every rule here is labeled
 * "proposed" in Figma). Kept in one module so the mock server, the UI copy
 * and, later, the real API all read the same values.
 *
 * Money is always integer minor units (cents), matching TransactionSchema.
 */

export const CURRENCY = "USD" as const;
export const LOCALE = "en-US" as const;

/** 8% of taxable goods, expressed in basis points to keep the math integer. */
export const TAX_RATE_BPS = 800;

export const SHIPPING_METHODS = {
  standard: { label: "Standard", priceCents: 500, minDays: 5, maxDays: 7 },
  express: { label: "Express", priceCents: 1200, minDays: 2, maxDays: 3 },
} as const;
export type ShippingMethodId = keyof typeof SHIPPING_METHODS;

export const STOREFRONT_PAGE_SIZE = 3;

/** C06 shows two reviews per page ("Showing 1–2 of 124 reviews"). */
export const REVIEWS_PAGE_SIZE = 2;

export const PASSWORD_MIN_LENGTH = 12;

export const RESET_LINK_TTL_MINUTES = 30;

export const GUEST_CODE_LENGTH = 6;
export const GUEST_CODE_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;

export const RETURN_WINDOW_DAYS = 30;

export const REVIEW_MIN_CHARS = 10;
export const REVIEW_MAX_CHARS = 2000;

/** A variant is "low stock" when available is at or below this. */
export const LOW_STOCK_THRESHOLD = 8;

export const DISCOUNT_PERCENT_MIN = 1;
export const DISCOUNT_PERCENT_MAX = 100;
export const DISCOUNTS_COMBINE_BY_DEFAULT = false;

export const STAFF_ROLES = [
  "catalog_editor",
  "fulfillment",
  "content_editor",
  "support",
  "admin",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Only admins issue refunds and manage discount permissions. */
export const REFUND_ROLES: readonly StaffRole[] = ["admin"];

export function taxOnCents(taxableCents: number): number {
  return Math.round((taxableCents * TAX_RATE_BPS) / 10_000);
}

export function isLowStock(available: number): boolean {
  return available > 0 && available <= LOW_STOCK_THRESHOLD;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(
    cents / 100,
  );
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Delivery estimate window for a method, relative to "now" (Figma O04:
 * placed 7 Oct → Standard "12–14 Oct", Express "9–10 Oct").
 */
export function shippingEstimate(method: ShippingMethodId, from: Date): { label: string; year: number } {
  const { minDays, maxDays } = SHIPPING_METHODS[method];
  const start = new Date(from.getTime() + minDays * 86_400_000);
  const end = new Date(from.getTime() + maxDays * 86_400_000);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const label = sameMonth
    ? `${String(start.getUTCDate())}–${SHORT_DATE.format(end)}`
    : `${SHORT_DATE.format(start)} – ${SHORT_DATE.format(end)}`;
  return { label, year: end.getUTCFullYear() };
}
