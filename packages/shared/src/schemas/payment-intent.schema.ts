import { z } from "zod";

export const PaymentIntentStatusSchema = z.enum(["processing", "paid", "declined", "pending"]);
export type PaymentIntentStatus = z.infer<typeof PaymentIntentStatusSchema>;

export const PaymentIntentSchema = z.object({
  id: z.string().min(1),
  /** One per attempt; a repeat call with the same key returns the same intent. */
  idempotencyKey: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  status: PaymentIntentStatusSchema,
  orderId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
