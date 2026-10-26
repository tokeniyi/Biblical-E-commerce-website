import { z } from "zod";
import { NonNegativeCentsSchema } from "./money.schema";
import { ProductSchema, RatingSummarySchema, VariantSchema } from "./product.schema";
import { ReviewSchema } from "./review.schema";

/**
 * Storefront listing contract (C03 / C04). The query lives in the page URL
 * and is sent to the API unchanged, so both sides parse it with the same
 * helpers. Absent params mean the defaults below, which is how the Figma
 * C03 / C04 frames render ("Active filters: English × · In stock ×").
 */

export const LISTING_SORTS = ["relevance", "price-asc", "price-desc", "rating", "newest"] as const;
export const LISTING_LANGUAGES = ["en", "es", "all"] as const;
export const LISTING_AVAILABILITY = ["in-stock", "all"] as const;

export type ListingSort = (typeof LISTING_SORTS)[number];
export type ListingLanguage = (typeof LISTING_LANGUAGES)[number];
export type ListingAvailability = (typeof LISTING_AVAILABILITY)[number];

export const ListingQuerySchema = z.object({
  q: z.string(),
  translation: z.array(z.string()),
  /** Bible type = product category slug (study, devotional, children). */
  type: z.array(z.string()),
  language: z.enum(LISTING_LANGUAGES),
  binding: z.string().nullable(),
  /** Whole dollars, as typed into the price range inputs. */
  priceMin: z.number().int().nonnegative().nullable(),
  priceMax: z.number().int().nonnegative().nullable(),
  availability: z.enum(LISTING_AVAILABILITY),
  largePrint: z.boolean(),
  sort: z.enum(LISTING_SORTS),
  page: z.number().int().min(1),
});
export type ListingQuery = z.infer<typeof ListingQuerySchema>;

export const DEFAULT_LISTING_QUERY: ListingQuery = {
  q: "",
  translation: [],
  type: [],
  language: "en",
  binding: null,
  priceMin: null,
  priceMax: null,
  availability: "in-stock",
  largePrint: false,
  sort: "relevance",
  page: 1,
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function list(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

function oneOf<T extends string>(options: readonly T[], raw: string | undefined, fallback: T): T {
  return options.includes(raw as T) ? (raw as T) : fallback;
}

function dollars(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,6}$/.test(raw)) return null;
  return Number(raw);
}

/**
 * Lenient parse: an unknown or malformed value falls back to its default,
 * so a hand-edited or stale URL never breaks the page.
 * Price is `price=MIN-MAX` in dollars; either side may be empty.
 */
export function parseListingQuery(source: ParamSource): ListingQuery {
  const [min, max] = (read(source, "price") ?? "").split("-");
  const page = Number(read(source, "page"));
  return {
    q: (read(source, "q") ?? "").trim(),
    translation: list(read(source, "translation")),
    type: list(read(source, "type")),
    language: oneOf(LISTING_LANGUAGES, read(source, "language"), DEFAULT_LISTING_QUERY.language),
    binding: read(source, "binding")?.trim() || null,
    priceMin: dollars(min),
    priceMax: dollars(max),
    availability: oneOf(LISTING_AVAILABILITY, read(source, "availability"), DEFAULT_LISTING_QUERY.availability),
    largePrint: read(source, "largePrint") === "true",
    sort: oneOf(LISTING_SORTS, read(source, "sort"), DEFAULT_LISTING_QUERY.sort),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** URL params for a query, defaults omitted so URLs stay short and shareable. */
export function listingQueryToParams(query: ListingQuery): URLSearchParams {
  const params = new URLSearchParams();
  const d = DEFAULT_LISTING_QUERY;
  if (query.q) params.set("q", query.q);
  if (query.translation.length) params.set("translation", query.translation.join(","));
  if (query.type.length) params.set("type", query.type.join(","));
  if (query.language !== d.language) params.set("language", query.language);
  if (query.binding) params.set("binding", query.binding);
  if (query.priceMin !== null || query.priceMax !== null) {
    params.set("price", `${String(query.priceMin ?? "")}-${String(query.priceMax ?? "")}`);
  }
  if (query.availability !== d.availability) params.set("availability", query.availability);
  if (query.largePrint) params.set("largePrint", "true");
  if (query.sort !== d.sort) params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  return params;
}

/**
 * Applies a facet or sort change. Any change other than the page itself
 * resets to page 1 (C03: "facet change resets page=1").
 */
export function updateListingQuery(query: ListingQuery, patch: Partial<ListingQuery>): ListingQuery {
  const next = { ...query, ...patch };
  if (patch.page === undefined) next.page = 1;
  return next;
}

/** "Clear all filters": back to the defaults, keeping only the search text. */
export function clearListingFilters(query: ListingQuery): ListingQuery {
  return { ...DEFAULT_LISTING_QUERY, q: query.q };
}

export const ListingItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  rating: RatingSummarySchema.nullable(),
  /** The first variant that matches the filters; it supplies the card's price and stock. */
  variant: VariantSchema,
});
export type ListingItem = z.infer<typeof ListingItemSchema>;

export const CategoryRefSchema = z.object({ slug: z.string(), name: z.string() });
export type CategoryRef = z.infer<typeof CategoryRefSchema>;

export const ListingResponseSchema = z.object({
  /** Null for search results (C04). */
  category: CategoryRefSchema.nullable(),
  query: ListingQuerySchema,
  items: z.array(ListingItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  pageCount: z.number().int().nonnegative(),
  /** Translation checkboxes, from the products in this category and language. */
  translations: z.array(z.string()),
  bindings: z.array(z.string()),
  /** C03 hint: a sold-out match hidden by "In stock only". */
  soldOutExample: z.object({ name: z.string(), priceCents: NonNegativeCentsSchema }).nullable(),
});
export type ListingResponse = z.infer<typeof ListingResponseSchema>;

/** GET /api/catalog/categories (C02). Counts are published editions. */
export const CategoryDirectorySchema = z.object({
  purposes: z.array(CategoryRefSchema.extend({ count: z.number().int().nonnegative() })),
  translations: z.array(z.object({ code: z.string(), name: z.string() })),
});
export type CategoryDirectory = z.infer<typeof CategoryDirectorySchema>;

/** Public review: the reviewer's account id stays on the server. */
export const PublicReviewSchema = ReviewSchema.omit({ customerId: true }).extend({
  /** "Hardcover / Standard" for the reviewed SKU. */
  variantLabel: z.string().nullable(),
});
export type PublicReview = z.infer<typeof PublicReviewSchema>;

export const ProductDetailSchema = z.object({
  product: ProductSchema,
  /** First category, for the breadcrumb and "Find alternatives" (E05). */
  category: CategoryRefSchema.nullable(),
  topReview: PublicReviewSchema.nullable(),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

export const REVIEW_SORTS = ["helpful", "newest", "highest", "lowest"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export const ReviewsQuerySchema = z.object({
  /** "all" or a star count. */
  rating: z.enum(["all", "5", "4", "3", "2", "1"]),
  sort: z.enum(REVIEW_SORTS),
  page: z.number().int().min(1),
});
export type ReviewsQuery = z.infer<typeof ReviewsQuerySchema>;

export function parseReviewsQuery(source: ParamSource): ReviewsQuery {
  const page = Number(read(source, "page"));
  return {
    rating: oneOf(["all", "5", "4", "3", "2", "1"] as const, read(source, "rating"), "all"),
    sort: oneOf(REVIEW_SORTS, read(source, "sort"), "helpful"),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function reviewsQueryToParams(query: ReviewsQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.rating !== "all") params.set("rating", query.rating);
  if (query.sort !== "helpful") params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  return params;
}

/** Whether the viewer may write a review for this product (C06 → A13). */
export const ReviewEligibilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("eligible"), orderId: z.string(), sku: z.string() }),
  z.object({ status: z.literal("signed-out") }),
  z.object({ status: z.literal("not-delivered") }),
  z.object({ status: z.literal("already-reviewed") }),
]);
export type ReviewEligibility = z.infer<typeof ReviewEligibilitySchema>;

export const ReviewsResponseSchema = z.object({
  product: z.object({
    slug: z.string(),
    name: z.string(),
    priceCents: NonNegativeCentsSchema,
    sku: z.string(),
  }),
  rating: RatingSummarySchema.nullable(),
  query: ReviewsQuerySchema,
  items: z.array(PublicReviewSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  pageCount: z.number().int().nonnegative(),
  eligibility: ReviewEligibilitySchema,
});
export type ReviewsResponse = z.infer<typeof ReviewsResponseSchema>;

/** "Standard print" reads as "Standard" in selects and summaries (C05, C07). */
export function shortPrintSize(printSize: string): string {
  return printSize === "Standard print" ? "Standard" : printSize;
}

/** "Hardcover / Standard", as in the C07 drawer and C06 review lines. */
export function variantShortLabel(variant: { binding: string; printSize: string }): string {
  return `${variant.binding} / ${shortPrintSize(variant.printSize)}`;
}

/** "ESV · Hardcover · Standard print", as on product cards. */
export function variantLongLabel(variant: { translation: string; binding: string; printSize: string }): string {
  return `${variant.translation} · ${variant.binding} · ${variant.printSize}`;
}
