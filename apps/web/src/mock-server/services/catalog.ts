// DELETE-ME-LATER: storefront catalog reads (C01–C06). The real API serves
// these from Postgres + Meilisearch (spec §10); the contract is the same.
import {
  REVIEWS_PAGE_SIZE,
  STOREFRONT_PAGE_SIZE,
  variantShortLabel,
  type CategoryDirectory,
  type CategoryRef,
  type ListingItem,
  type ListingQuery,
  type ListingResponse,
  type Product,
  type ProductDetail,
  type PublicReview,
  type Review,
  type ReviewEligibility,
  type ReviewsQuery,
  type ReviewsResponse,
  type Variant,
} from "@your-app/shared";
import { MockApiError } from "../http";
import type { Db } from "../types";
import type { SessionLookup } from "./auth";

type CategoryDef = CategoryRef & {
  /** Product-level membership. */
  product?: (product: Product) => boolean;
  /** Variant-level membership (e.g. large print is a variant property). */
  variant?: (variant: Variant) => boolean;
};

const inCategory = (slug: string) => (product: Product) => product.categorySlugs.includes(slug);

/**
 * Every C03 category slug. `bibles` is "All Bibles" (Figma C03 route).
 * Family reading and Gift editions are the C02 featured collections; their
 * membership rules are proposed here (open question in the Phase 1 PR).
 */
const CATEGORIES: readonly CategoryDef[] = [
  { slug: "bibles", name: "All Bibles" },
  { slug: "study", name: "Study Bibles", product: inCategory("study") },
  { slug: "devotional", name: "Devotional Bibles", product: inCategory("devotional") },
  { slug: "children", name: "Children’s Bibles", product: inCategory("children") },
  { slug: "journaling", name: "Journaling Bibles", product: inCategory("journaling") },
  { slug: "large-print", name: "Large Print", variant: (v) => v.printSize === "Large print" },
  {
    slug: "family-reading",
    name: "Family reading",
    product: (p) => p.categorySlugs.includes("children") || p.categorySlugs.includes("devotional"),
  },
  { slug: "gift-editions", name: "Gift editions", product: (p) => / gift /i.test(` ${p.name} `) },
];

/** C02 "By purpose" panel, in Figma order. */
const PURPOSES = ["study", "devotional", "children", "journaling"] as const;

/** C02 "By translation" panel, in Figma order. */
const TRANSLATION_NAMES = [
  { code: "KJV", name: "King James Version" },
  { code: "NIV", name: "New International Version" },
  { code: "ESV", name: "English Standard Version" },
  { code: "NLT", name: "New Living Translation" },
] as const;

export function findCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

function categoryRef(def: CategoryDef): CategoryRef {
  return { slug: def.slug, name: def.name };
}

function isPublished(product: Product): boolean {
  return product.status === "published";
}

function publishedVariants(product: Product): Variant[] {
  return product.variants.filter((v) => v.status === "published");
}

function haystack(product: Product): string {
  const variantText = publishedVariants(product).map((v) => `${v.translation} ${v.binding} ${v.sku} ${v.isbn}`);
  return `${product.name} ${variantText.join(" ")}`.toLowerCase();
}

/** Every whitespace-separated term must appear somewhere (title, translation, SKU, ISBN). */
export function matchesSearch(product: Product, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const text = haystack(product);
  return terms.every((term) => text.includes(term));
}

type Ignore = { availability?: boolean };

/** Variants of a product that pass the variant-level filters, in seed order. */
function matchingVariants(product: Product, category: CategoryDef, query: ListingQuery, ignore: Ignore = {}): Variant[] {
  const { translation, binding, largePrint, priceMin, priceMax, availability } = query;
  return publishedVariants(product).filter(
    (v) =>
      (!category.variant || category.variant(v)) &&
      (translation.length === 0 || translation.includes(v.translation)) &&
      (!binding || v.binding === binding) &&
      (!largePrint || v.printSize === "Large print") &&
      (priceMin === null || v.priceCents >= priceMin * 100) &&
      (priceMax === null || v.priceCents <= priceMax * 100) &&
      (ignore.availability || availability === "all" || v.stock.available > 0),
  );
}

/** Products in the category and language, before the other facets: the facet option source. */
function baseProducts(db: Db, category: CategoryDef, query: ListingQuery): Product[] {
  return db.products.filter(
    (p) =>
      isPublished(p) &&
      (query.language === "all" || p.language === query.language) &&
      (!category.product || category.product(p)),
  );
}

function matchProducts(base: Product[], category: CategoryDef, query: ListingQuery, ignore: Ignore = {}): ListingItem[] {
  const items: ListingItem[] = [];
  for (const product of base) {
    if (query.q && !matchesSearch(product, query.q)) continue;
    if (query.type.length > 0 && !query.type.some((t) => product.categorySlugs.includes(t))) continue;
    const first = matchingVariants(product, category, query, ignore).at(0);
    if (first) items.push({ slug: product.slug, name: product.name, rating: product.rating, variant: first });
  }
  return items;
}

const SORTERS: Record<ListingQuery["sort"], ((a: ListingItem, b: ListingItem, db: Db) => number) | null> = {
  // Seed order: the curated "featured" order the frames draw.
  relevance: null,
  "price-asc": (a, b) => a.variant.priceCents - b.variant.priceCents,
  "price-desc": (a, b) => b.variant.priceCents - a.variant.priceCents,
  rating: (a, b) => (b.rating?.average ?? -1) - (a.rating?.average ?? -1),
  newest: (a, b, db) => createdAt(db, b.slug) - createdAt(db, a.slug),
};

function createdAt(db: Db, slug: string): number {
  return Date.parse(db.products.find((p) => p.slug === slug)?.createdAt ?? "");
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * C03 (category set) and C04 (category null: search across all Bibles).
 * Server-authoritative counts, facets, sort and pagination.
 */
export function listProducts(db: Db, categorySlug: string | null, query: ListingQuery): ListingResponse {
  const category = categorySlug === null ? findCategory("bibles") : findCategory(categorySlug);
  if (!category) throw new MockApiError("not_found", "We can’t find that category.");

  const base = baseProducts(db, category, query);
  const items = matchProducts(base, category, query);
  const sorter = SORTERS[query.sort];
  if (sorter) items.sort((a, b) => sorter(a, b, db));

  const pageSize = STOREFRONT_PAGE_SIZE;
  const pageCount = Math.ceil(items.length / pageSize);
  // Past the end (a stale shared link): show the last page instead of nothing.
  const page = pageCount === 0 ? 1 : Math.min(query.page, pageCount);
  const start = (page - 1) * pageSize;

  let soldOutExample: ListingResponse["soldOutExample"] = null;
  if (query.availability === "in-stock") {
    const listed = new Set(items.map((i) => i.slug));
    const hidden = matchProducts(base, category, query, { availability: true }).find((i) => !listed.has(i.slug));
    if (hidden) soldOutExample = { name: hidden.name, priceCents: hidden.variant.priceCents };
  }

  const baseVariants = base.flatMap((p) => publishedVariants(p).filter((v) => !category.variant || category.variant(v)));
  return {
    category: categorySlug === null ? null : categoryRef(category),
    query: { ...query, page },
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
    pageCount,
    translations: uniqueSorted(baseVariants.map((v) => v.translation)),
    bindings: uniqueSorted(baseVariants.map((v) => v.binding)),
    soldOutExample,
  };
}

/** C02: counts are published editions per purpose, whatever their stock. */
export function categoryDirectory(db: Db): CategoryDirectory {
  const published = db.products.filter(isPublished);
  return {
    purposes: PURPOSES.map((slug) => {
      const def = findCategory(slug);
      if (!def?.product) throw new Error(`Category ${slug} is missing`);
      const matches = def.product;
      return { ...categoryRef(def), count: published.filter((p) => matches(p)).length };
    }),
    translations: TRANSLATION_NAMES.map((t) => ({ ...t })),
  };
}

function publicProduct(slug: string, db: Db): Product {
  const product = db.products.find((p) => p.slug === slug);
  // Drafts and archived products are not public: same 404 as unknown (E19).
  if (!product || !isPublished(product)) throw new MockApiError("not_found", "We can’t find that page.");
  return { ...product, variants: product.variants.filter((v) => v.status !== "archived") };
}

function toPublicReview(review: Review, product: Product): PublicReview {
  const { customerId: _customerId, ...rest } = review;
  const variant = product.variants.find((v) => v.sku === review.sku);
  return { ...rest, variantLabel: variant ? variantShortLabel(variant) : null };
}

function publishedReviews(db: Db, slug: string): Review[] {
  return db.reviews.filter((r) => r.productSlug === slug && r.status === "published");
}

const REVIEW_SORTERS: Record<ReviewsQuery["sort"], (a: Review, b: Review) => number> = {
  helpful: (a, b) => b.helpfulCount - a.helpfulCount || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  highest: (a, b) => b.rating - a.rating || b.helpfulCount - a.helpfulCount,
  lowest: (a, b) => a.rating - b.rating || b.helpfulCount - a.helpfulCount,
};

export function productDetail(db: Db, slug: string): ProductDetail {
  const product = publicProduct(slug, db);
  const top = publishedReviews(db, slug).sort(REVIEW_SORTERS.helpful).at(0);
  const firstCategory = product.categorySlugs.map(findCategory).find(Boolean);
  return {
    product,
    category: firstCategory ? categoryRef(firstCategory) : null,
    topReview: top ? toPublicReview(top, product) : null,
  };
}

/**
 * C06 → A13 gate: a customer may review a product they received (a
 * delivered order line), once per product (spec §2).
 */
export function reviewEligibility(db: Db, product: Product, viewer: SessionLookup): ReviewEligibility {
  if (viewer.status !== "active" || viewer.session.kind !== "customer") return { status: "signed-out" };
  const { userId } = viewer.session;
  if (db.reviews.some((r) => r.productSlug === product.slug && r.customerId === userId)) {
    return { status: "already-reviewed" };
  }
  const skus = new Set(product.variants.map((v) => v.sku));
  for (const order of db.orders) {
    if (order.customerId !== userId || order.fulfillmentStatus !== "delivered") continue;
    const line = order.lines.find((l) => skus.has(l.sku));
    if (line) return { status: "eligible", orderId: order.id, sku: line.sku };
  }
  return { status: "not-delivered" };
}

export function listReviews(db: Db, slug: string, query: ReviewsQuery, viewer: SessionLookup): ReviewsResponse {
  const product = publicProduct(slug, db);
  const all = publishedReviews(db, slug);
  const filtered = query.rating === "all" ? all : all.filter((r) => r.rating === Number(query.rating));
  filtered.sort(REVIEW_SORTERS[query.sort]);

  const pageSize = REVIEWS_PAGE_SIZE;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const page = pageCount === 0 ? 1 : Math.min(query.page, pageCount);
  const start = (page - 1) * pageSize;
  const variant = publishedVariants(product).at(0) ?? product.variants.at(0);
  if (!variant) throw new MockApiError("not_found", "We can’t find that page.");

  return {
    product: { slug: product.slug, name: product.name, priceCents: variant.priceCents, sku: variant.sku },
    rating: product.rating,
    query: { ...query, page },
    items: filtered.slice(start, start + pageSize).map((r) => toPublicReview(r, product)),
    total: filtered.length,
    page,
    pageSize,
    pageCount,
    eligibility: reviewEligibility(db, product, viewer),
  };
}

/** Looks up a variant and its product by SKU. */
export function findVariant(db: Db, sku: string): { product: Product; variant: Variant } | null {
  for (const product of db.products) {
    const variant = product.variants.find((v) => v.sku === sku);
    if (variant) return { product, variant };
  }
  return null;
}

/** Published product and published variant: the only things a customer can buy or save. */
export function isPurchasable(found: { product: Product; variant: Variant } | null): found is { product: Product; variant: Variant } {
  return !!found && isPublished(found.product) && found.variant.status === "published";
}
