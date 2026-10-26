import { z } from "zod";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "../config/rules";

export const ReviewStatusSchema = z.enum(["pending", "published", "rejected"]);

export const ReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1),
  body: z.string().trim().min(REVIEW_MIN_CHARS).max(REVIEW_MAX_CHARS),
});
export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export const ReviewSchema = ReviewInputSchema.extend({
  id: z.string().min(1),
  productSlug: z.string(),
  sku: z.string(),
  authorName: z.string(),
  customerId: z.string().nullable(),
  /** Server-derived from a delivered purchase. */
  verifiedPurchase: z.boolean(),
  status: ReviewStatusSchema,
  helpfulCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type Review = z.infer<typeof ReviewSchema>;
