import { z } from "zod";

export const PaymentProviderSchema = z.enum(["paystack", "stripe"]);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const TransactionStatusSchema = z.enum(["pending", "success", "failed"]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * Internal, provider-agnostic transaction shape. Paystack and Stripe
 * webhook payloads get normalized into this shape before being written
 * to the database - the rest of the app never branches on provider.
 */
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: PaymentProviderSchema,
  // Paystack: transaction reference. Stripe: payment_intent id.
  providerReference: z.string().min(1),
  amountMinorUnits: z.number().int().nonnegative(), // e.g. kobo / cents
  currency: z.string().length(3), // ISO 4217, e.g. "NGN", "USD"
  status: TransactionStatusSchema,
  createdAt: z.coerce.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;