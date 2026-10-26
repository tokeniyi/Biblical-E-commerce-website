import { z } from "zod";

export const StockAdjustmentInputSchema = z.object({
  sku: z.string().min(1),
  /** Change to on-hand; may be negative. */
  delta: z.number().int(),
  reason: z.string().trim().min(1, "Enter a reason"),
  /** Variant version the editor saw; a mismatch => version_conflict (E25). */
  expectedVersion: z.number().int().nonnegative(),
});
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentInputSchema>;

export const StockAdjustmentSchema = StockAdjustmentInputSchema.extend({
  id: z.string(),
  actorEmail: z.string().email(),
  createdAt: z.string().datetime(),
});
export type StockAdjustment = z.infer<typeof StockAdjustmentSchema>;
