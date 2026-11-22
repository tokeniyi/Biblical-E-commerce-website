import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "../config/rules";
import { AddressSchema } from "./address.schema";
import { OrderSchema } from "./order.schema";

/** POST /api/session/login (A01 customers, B01 staff). */
export const LoginInputSchema = z.object({
  email: z.string().trim().email("Enter an email address like name@example.com."),
  password: z.string().min(1, "Enter your password."),
  /** Which sign-in page: staff sign-in never accepts customer accounts. */
  audience: z.enum(["customer", "staff"]).default("customer"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

/** POST /api/account/register (A02). */
export const RegisterInputSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().email("Enter an email address like name@example.com."),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${String(PASSWORD_MIN_LENGTH)} characters.`).max(200),
  marketingOptIn: z.boolean().default(false),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

/** One row of A10 order history. */
export const OrderSummarySchema = OrderSchema.pick({
  id: true,
  placedAt: true,
  paymentStatus: true,
  fulfillmentStatus: true,
  deliveredAt: true,
}).extend({
  totalCents: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  firstLine: z.object({ productName: z.string(), variantLabel: z.string() }).nullable(),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;

export const AccountOrdersSchema = z.object({ orders: z.array(OrderSummarySchema) });
export type AccountOrders = z.infer<typeof AccountOrdersSchema>;

export const AccountOrderSchema = z.object({ order: OrderSchema });

/** A12 wishlist with the product data needed to render it. */
export const WishlistItemSchema = z.object({
  sku: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  variantLabel: z.string(),
  translation: z.string(),
  binding: z.string(),
  priceCents: z.number().int().nonnegative(),
  available: z.number().int(),
});
export const WishlistItemsSchema = z.object({ items: z.array(WishlistItemSchema) });
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

function hasControlChars(value: string): boolean {
  for (const ch of value) if (ch.charCodeAt(0) < 0x20) return true;
  return false;
}

/**
 * Same-origin relative paths only: rejects "//host", absolute URLs,
 * backslashes and javascript: (spec §5.5).
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/account"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(value) || hasControlChars(value)) return fallback;
  return value;
}

/** GET /api/account/profile: A07/A08/A09 data for the signed-in customer. */
export const AccountProfileSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  marketingOptIn: z.boolean(),
  addresses: z.array(AddressSchema),
  reviews: z.array(
    z.object({
      id: z.string(),
      productSlug: z.string(),
      rating: z.number().int(),
      title: z.string(),
      status: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type AccountProfile = z.infer<typeof AccountProfileSchema>;

/** GET /api/admin/overview (B02): store totals for the admin dashboard. */
export const AdminOverviewSchema = z.object({
  orderCount: z.number().int(),
  revenueCents: z.number().int(),
  averageOrderCents: z.number().int(),
  unfulfilledCount: z.number().int(),
  lowStock: z.array(z.object({ sku: z.string(), productName: z.string(), available: z.number().int() })),
  recentOrders: z.array(OrderSummarySchema.extend({ email: z.string() })),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;
