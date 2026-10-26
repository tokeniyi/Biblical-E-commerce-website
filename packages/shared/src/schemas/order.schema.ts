import { z } from "zod";
import { AddressInputSchema } from "./address.schema";
import { QuoteSchema } from "./quote.schema";

/** Payment and fulfillment are separate fields (spec §5.10). */
export const PaymentStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "partially_refunded",
  "refunded",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const FulfillmentStatusSchema = z.enum([
  "unfulfilled",
  /** Shown as "On hold" for a pending-payment order in Figma B02; not in spec §5.10. */
  "on_hold",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>;

export const OrderLineSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  variantLabel: z.string(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().nonnegative(),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const OrderSchema = z.object({
  id: z.string().regex(/^BS-\d+$/),
  customerId: z.string().nullable(),
  email: z.string().email(),
  lines: z.array(OrderLineSchema),
  totals: QuoteSchema.omit({ lines: true }),
  shippingAddress: AddressInputSchema,
  paymentStatus: PaymentStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema,
  paymentMethodLabel: z.string(),
  placedAt: z.string().datetime(),
  deliveredAt: z.string().datetime().nullable(),
  tracking: z.object({ carrier: z.string(), number: z.string() }).nullable(),
  /** Captured minus refunded; refunds can never exceed this. */
  remainingBalanceCents: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
});
export type Order = z.infer<typeof OrderSchema>;
