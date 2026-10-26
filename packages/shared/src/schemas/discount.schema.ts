import { z } from "zod";
import { DISCOUNT_PERCENT_MAX, DISCOUNT_PERCENT_MIN } from "../config/rules";

export const DiscountKindSchema = z.enum(["percent", "fixed"]);
export const DiscountStatusSchema = z.enum(["active", "scheduled", "expired", "disabled"]);
export type DiscountStatus = z.infer<typeof DiscountStatusSchema>;

export const DiscountInputSchema = z
  .object({
    /** Unique, case-insensitive; stored upper-case. */
    code: z
      .string()
      .trim()
      .min(1)
      .transform((c) => c.toUpperCase()),
    kind: DiscountKindSchema,
    /** Percent (1-100) for "percent", cents for "fixed". */
    value: z.number().int().positive(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    usageLimit: z.number().int().positive().nullable(),
    enabled: z.boolean(),
    eligibleCategorySlugs: z.array(z.string()),
    minimumSubtotalCents: z.number().int().nonnegative().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "percent" && (d.value < DISCOUNT_PERCENT_MIN || d.value > DISCOUNT_PERCENT_MAX)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: `Percent must be ${String(DISCOUNT_PERCENT_MIN)}-${String(DISCOUNT_PERCENT_MAX)}`,
      });
    }
    if (Date.parse(d.endsAt) <= Date.parse(d.startsAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "End date must be after start date",
      });
    }
  });
export type DiscountInput = z.infer<typeof DiscountInputSchema>;

export type Discount = DiscountInput & {
  usageCount: number;
  version: number;
};
