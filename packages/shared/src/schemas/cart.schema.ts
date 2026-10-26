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
