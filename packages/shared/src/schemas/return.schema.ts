import { z } from "zod";

/**
 * Statuses are mutually exclusive. Whether "received" comes before or after
 * "approved" is an open question (spec §3.2 O13 vs §5.10); see
 * docs/WIREFRAME_PROGRESS.md.
 */
export const ReturnStatusSchema = z.enum(["requested", "received", "approved", "refunded", "denied"]);
export type ReturnStatus = z.infer<typeof ReturnStatusSchema>;

export const ReturnRequestSchema = z.object({
  rma: z.string().regex(/^RMA-\d+$/),
  orderId: z.string(),
  lines: z.array(z.object({ sku: z.string(), quantity: z.number().int().min(1) })),
  reason: z.string().min(1),
  conditionDetail: z.string(),
  status: ReturnStatusSchema,
  refundEstimateCents: z.number().int().nonnegative(),
  refundReference: z.string().nullable(),
  deniedReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ReturnRequest = z.infer<typeof ReturnRequestSchema>;
