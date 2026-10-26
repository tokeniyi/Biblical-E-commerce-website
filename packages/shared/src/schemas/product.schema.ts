import { z } from "zod";
import { NonNegativeCentsSchema, VersionSchema } from "./money.schema";

export const ProductStatusSchema = z.enum(["draft", "published", "archived"]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const StockSchema = z.object({
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  /** onHand - reserved, computed by the server. */
  available: z.number().int().nonnegative(),
});
export type Stock = z.infer<typeof StockSchema>;

export const VariantSchema = z.object({
  sku: z.string().min(1),
  productSlug: z.string().min(1),
  translation: z.string().min(1),
  binding: z.string().min(1),
  printSize: z.string().min(1),
  isbn: z.string().min(1),
  /** Body text size, e.g. 9 for "9 pt standard" (C05 specifications). */
  fontSizePt: z.number().positive().nullable(),
  priceCents: NonNegativeCentsSchema,
  status: ProductStatusSchema,
  stock: StockSchema,
  version: VersionSchema,
});
export type Variant = z.infer<typeof VariantSchema>;

export const RatingSummarySchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
  /** Counts for 5, 4, 3, 2 and 1 stars, in that order. */
  histogram: z.tuple([
    z.number().int(),
    z.number().int(),
    z.number().int(),
    z.number().int(),
    z.number().int(),
  ]),
});

/** C05 "Specifications" panel; null fields are omitted from the page. */
export const ProductSpecsSchema = z.object({
  pages: z.number().int().positive().nullable(),
  trimSize: z.string().nullable(),
  publisher: z.string().nullable(),
});

export const ProductSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  categorySlugs: z.array(z.string()),
  language: z.string().min(1),
  status: ProductStatusSchema,
  variants: z.array(VariantSchema),
  rating: RatingSummarySchema.nullable(),
  specs: ProductSpecsSchema,
  /** Drives the "Newest" sort. */
  createdAt: z.string().datetime(),
  version: VersionSchema,
});
export type Product = z.infer<typeof ProductSchema>;
