import { z } from "zod";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "../config/rules";

export const ReviewStatusSchema = z.enum(["pending", "published", "rejected"]);

const RATING_MESSAGE = "Choose a rating from 1 to 5.";

export const ReviewInputSchema = z.object({
  rating: z
    .number({ invalid_type_error: RATING_MESSAGE, required_error: RATING_MESSAGE })
    .int(RATING_MESSAGE)
    .min(1, RATING_MESSAGE)
    .max(5, RATING_MESSAGE),
  title: z.string().trim().min(1, "Enter a review title."),
  body: z
    .string()
    .trim()
    .min(REVIEW_MIN_CHARS, `Write at least ${String(REVIEW_MIN_CHARS)} characters.`)
    .max(REVIEW_MAX_CHARS, "Keep your review to 2,000 characters or fewer."),
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
  /** The delivered order that made the reviewer eligible (A13); null for seeded filler. */
  orderId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type Review = z.infer<typeof ReviewSchema>;
