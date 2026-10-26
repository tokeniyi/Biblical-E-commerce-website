import { z } from "zod";
import { NonNegativeCentsSchema } from "./money.schema";

export const CartLineSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1),
  /** Price the customer last saw; the quote decides what is actually charged. */
  unitPriceCents: NonNegativeCentsSchema,
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartSchema = z.object({
  token: z.string().min(1),
  lines: z.array(CartLineSchema),
  /** "Saved for later" (C08) - distinct from the account wishlist. */
  saved: z.array(z.object({ sku: z.string().min(1) })),
  promoCode: z.string().nullable(),
});
export type Cart = z.infer<typeof CartSchema>;

/** A cart line as the storefront shows it: names and stock come from the catalog. */
export const CartLineViewSchema = CartLineSchema.extend({
  productSlug: z.string(),
  productName: z.string(),
  /** "Hardcover / Standard" */
  variantLabel: z.string(),
  lineTotalCents: NonNegativeCentsSchema,
  available: z.number().int().nonnegative(),
});
export type CartLineView = z.infer<typeof CartLineViewSchema>;

/** A saved-for-later row (C08): current price and stock, rechecked on every read. */
export const SavedItemViewSchema = z.object({
  sku: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  binding: z.string(),
  /** Category for "View alternatives", when the item is out of stock. */
  categorySlug: z.string().nullable(),
  priceCents: NonNegativeCentsSchema,
  available: z.number().int().nonnegative(),
});
export type SavedItemView = z.infer<typeof SavedItemViewSchema>;

/** GET /api/cart. The cart token itself stays in an httpOnly cookie. */
export const CartViewSchema = z.object({
  lines: z.array(CartLineViewSchema),
  saved: z.array(SavedItemViewSchema),
  /** Sum of quantities: the header "Cart (n)" and C07 "Cart: 2 items". */
  itemCount: z.number().int().nonnegative(),
  subtotalCents: NonNegativeCentsSchema,
});
export type CartView = z.infer<typeof CartViewSchema>;

export const AddToCartInputSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1),
});
export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;

/** POST /api/cart/lines and POST /api/cart/saved/:sku/move. */
export const CartMutationResponseSchema = z.object({
  cart: CartViewSchema,
  /** What this request added, for the C07 drawer ("Quantity 1 · $39.00"). */
  added: z.object({ sku: z.string(), quantity: z.number().int().min(1) }),
});
export type CartMutationResponse = z.infer<typeof CartMutationResponseSchema>;
