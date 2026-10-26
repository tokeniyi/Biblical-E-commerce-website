import { z } from "zod";
import { CentsSchema, NonNegativeCentsSchema } from "./money.schema";

export const ShippingMethodIdSchema = z.enum(["standard", "express"]);

export const QuoteLineSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().min(1),
  unitPriceCents: NonNegativeCentsSchema,
  lineTotalCents: NonNegativeCentsSchema,
});

/** Server-authoritative totals. Any drift vs the client's cart => quote_changed (E06). */
export const QuoteSchema = z.object({
  lines: z.array(QuoteLineSchema),
  subtotalCents: NonNegativeCentsSchema,
  shippingCents: NonNegativeCentsSchema,
  taxCents: NonNegativeCentsSchema,
  /** Zero or negative. */
  discountCents: CentsSchema.nonpositive(),
  totalCents: NonNegativeCentsSchema,
  shippingMethod: ShippingMethodIdSchema.nullable(),
  promoCode: z.string().nullable(),
});
export type Quote = z.infer<typeof QuoteSchema>;
