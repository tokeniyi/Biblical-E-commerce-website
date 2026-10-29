// DELETE-ME-LATER: fixtures that make the wireframes render as drawn (spec §6).
import type { Address, ContentPage, Discount, Order, Product, Review, Variant } from "@your-app/shared";
import type { CustomerRecord, Db, StaffRecord } from "./types";

/** Shared mock password for every seeded account, so testers can sign in. */
export const SEED_PASSWORD = "wireframe-password";

type VariantSeed = {
  sku: string;
  translation: string;
  binding: string;
  printSize: string;
  priceCents: number;
  onHand: number;
  reserved: number;
  isbn: string;
  status?: Variant["status"];
};

function variant(productSlug: string, v: VariantSeed): Variant {
  return {
    sku: v.sku,
    productSlug,
    translation: v.translation,
    binding: v.binding,
    printSize: v.printSize,
    isbn: v.isbn,
    fontSizePt: v.printSize === "Large print" ? 12 : 9,
    priceCents: v.priceCents,
    status: v.status ?? "published",
    stock: { onHand: v.onHand, reserved: v.reserved, available: v.onHand - v.reserved },
    version: 1,
  };
}

type ProductExtra = Partial<Pick<Product, "status" | "rating" | "description" | "language" | "specs">> & {
  createdAt: string;
};

function product(
  slug: string,
  name: string,
  categorySlugs: string[],
  variants: VariantSeed[],
  extra: ProductExtra,
): Product {
  return {
    slug,
    name,
    description: extra.description ?? "",
    categorySlugs,
    language: extra.language ?? "en",
    status: extra.status ?? "published",
    variants: variants.map((v) => variant(slug, v)),
    rating: extra.rating ?? null,
    specs: extra.specs ?? { pages: null, trimSize: null, publisher: null },
    createdAt: extra.createdAt,
    version: 1,
  };
}

/** The named products from the Figma frames, in C01 "Popular Bibles" order. */
function namedProducts(): Product[] {
  return [
    product(
      "esv-study-bible",
      "ESV Study Bible",
      ["study"],
      [
        { sku: "ESV-ST-HC", translation: "ESV", binding: "Hardcover", printSize: "Standard print", priceCents: 3900, onHand: 15, reserved: 3, isbn: "978-1-00000-001-1" },
        // Draft leather-look large print: drives E12 (variant unavailable).
        { sku: "ESV-ST-LL-LP", translation: "ESV", binding: "Leather-look", printSize: "Large print", priceCents: 4900, onHand: 0, reserved: 0, isbn: "978-1-00000-002-8", status: "draft" },
      ],
      {
        // Stored aggregate as drawn in C05/C06. The histogram averages 4.71:
        // open question 4 in docs/WIREFRAME_PROGRESS.md.
        rating: { average: 4.8, count: 124, histogram: [98, 19, 5, 1, 1] },
        description:
          "An ESV study edition with book introductions, study notes, maps and reading plans. Designed for deeper study and daily reference.",
        specs: { pages: 2752, trimSize: "6.5 × 9.25 in", publisher: "Example Press" },
        createdAt: "2026-03-02T09:00:00.000Z",
      },
    ),
    product(
      "niv-everyday-bible",
      "NIV Everyday Bible",
      ["devotional"],
      [{ sku: "NIV-EV-PB", translation: "NIV", binding: "Paperback", printSize: "Standard print", priceCents: 2400, onHand: 28, reserved: 2, isbn: "978-1-00000-003-5" }],
      { specs: { pages: 1408, trimSize: "5.5 × 8.25 in", publisher: "Example Press" }, createdAt: "2026-02-16T09:00:00.000Z" },
    ),
    product(
      "kjv-large-print-bible",
      "KJV Large Print Bible",
      ["devotional"],
      [{ sku: "KJV-LP-LL", translation: "KJV", binding: "Leather-look", printSize: "Large print", priceCents: 3200, onHand: 9, reserved: 1, isbn: "978-1-00000-004-2" }],
      { specs: { pages: 1856, trimSize: "7 × 10 in", publisher: "Example Press" }, createdAt: "2026-01-19T09:00:00.000Z" },
    ),
    product(
      "nlt-childrens-bible",
      "NLT Children’s Bible",
      ["children"],
      [{ sku: "NLT-CH-HC", translation: "NLT", binding: "Hardcover", printSize: "Standard print", priceCents: 2200, onHand: 0, reserved: 0, isbn: "978-1-00000-005-9" }],
      { specs: { pages: 1216, trimSize: "6 × 9 in", publisher: "Example Press" }, createdAt: "2026-01-05T09:00:00.000Z" },
    ),
    product(
      "esv-journaling-bible",
      "ESV Journaling Bible",
      ["journaling"],
      [{ sku: "ESV-JR-PB", translation: "ESV", binding: "Paperback", printSize: "Standard print", priceCents: 2800, onHand: 0, reserved: 0, isbn: "978-1-00000-006-6", status: "draft" }],
      { status: "draft", createdAt: "2026-09-28T09:00:00.000Z" },
    ),
  ];
}

const FILLER_TRANSLATIONS = ["ESV", "KJV", "NIV", "NLT"] as const;
const SPANISH_TRANSLATIONS = ["RVR1960", "NVI"] as const;
const FILLER_STYLES = ["Thinline", "Compact", "Reference", "Gift", "Pew", "Premium"] as const;
const BINDINGS = ["Hardcover", "Paperback", "Leather-look"] as const;

const inRange = (i: number, from: number, to: number) => i >= from && i <= to;

/**
 * Category membership for filler product i. Products may sit in several
 * categories, so C02's counts can be drawn as in Figma (Study 24,
 * Devotional 18, Children 12, Journaling 16) with 48 products in total.
 */
function fillerCategories(i: number): string[] {
  const slugs: string[] = [];
  if (inRange(i, 0, 22) || i >= 41) slugs.push("study");
  if (inRange(i, 23, 38)) slugs.push("devotional");
  if (inRange(i, 30, 40)) slugs.push("children");
  if (inRange(i, 15, 30)) slugs.push("journaling");
  return slugs;
}

/**
 * Deterministic filler, tuned so every count drawn in Figma is what the
 * server actually returns:
 * - 48 products / 64 variants, 3 draft products, 2 low-stock variants (B02)
 * - 24 English Bibles in stock (C03): 3 named + filler 0–19 and 40
 *   (filler 20–35 are sold out, 36–39 are Spanish, 41–42 are drafts)
 * - 18 in-stock English results for "bible" (C04): filler 14–19 are titled
 *   "Edition" rather than "Bible"
 */
function fillerProducts(): Product[] {
  const products: Product[] = [];
  for (let i = 0; i < 43; i++) {
    const n = String(i + 1).padStart(2, "0");
    const spanish = inRange(i, 36, 39);
    const translation = spanish
      ? (SPANISH_TRANSLATIONS[i % 2] ?? "RVR1960")
      : (FILLER_TRANSLATIONS[i % FILLER_TRANSLATIONS.length] ?? "ESV");
    const style = FILLER_STYLES[Math.floor(i / 4) % FILLER_STYLES.length] ?? "Gift";
    const name = spanish
      ? `${translation} Biblia ${style}`
      : `${translation} ${style} ${inRange(i, 14, 19) ? "Edition" : "Bible"}`;
    const slug = `${name.toLowerCase().replace(/\s+/g, "-")}-${n}`;
    const base = `${translation}-${style.slice(0, 2).toUpperCase()}${n}`;
    // 15 products get a second binding: 43 + 15 + 6 named = 64 variants.
    const bindings = i < 15 ? BINDINGS.slice(0, 2) : BINDINGS.slice(i % 3, (i % 3) + 1);
    const isDraft = i >= 41;
    const soldOut = inRange(i, 20, 35);
    const isLowStock = i === 7;
    products.push(
      product(
        slug,
        name,
        fillerCategories(i),
        bindings.map((binding, j) => ({
          sku: `${base}-${binding.slice(0, 2).toUpperCase()}`,
          translation,
          binding,
          printSize: "Standard print",
          isbn: `978-1-00001-${String(i * 2 + j).padStart(3, "0")}-0`,
          priceCents: 1800 + ((i * 7 + j * 5) % 30) * 100,
          onHand: isDraft || soldOut ? 0 : isLowStock && j === 0 ? 6 : 20 + (i % 10),
          reserved: isDraft || soldOut ? 0 : 1,
          status: isDraft ? "draft" : "published",
        })),
        {
          status: isDraft ? "draft" : "published",
          language: spanish ? "es" : "en",
          description: `A ${translation} ${style.toLowerCase()} edition for everyday reading.`,
          specs: { pages: 1100 + i * 20, trimSize: "5.5 × 8.25 in", publisher: "Example Press" },
          createdAt: new Date(Date.UTC(2025, 0, 1 + i * 7, 9)).toISOString(),
        },
      ),
    );
  }
  return products;
}

/**
 * ESV Study Bible reviews: the two drawn in C05/C06 plus filler so the
 * histogram (98/19/5/1/1) and "Showing 1–2 of 124 reviews" are real.
 */
function reviews(): Review[] {
  const base = {
    productSlug: "esv-study-bible",
    sku: "ESV-ST-HC",
    status: "published" as const,
    verifiedPurchase: true,
  };
  const named: Review[] = [
    {
      ...base,
      id: "rev_taylor",
      rating: 5,
      title: "Clear notes and sturdy binding",
      body: "The notes make difficult passages easier to understand. The pages are readable and the hardcover holds up well for daily study.",
      authorName: "Taylor M.",
      customerId: null,
      helpfulCount: 8,
      createdAt: "2026-09-24T12:00:00.000Z",
    },
    {
      ...base,
      id: "rev_sam",
      rating: 4,
      title: "Useful maps",
      body: "A useful reference edition. A large-print version would be easier for me to read.",
      authorName: "Sam R.",
      customerId: "cus_sam",
      helpfulCount: 3,
      createdAt: "2026-09-08T12:00:00.000Z",
    },
  ];
  // Remaining counts per star after Taylor (5) and Sam (4).
  const remaining: [number, number][] = [[5, 97], [4, 18], [3, 5], [2, 1], [1, 1]];
  const filler: Review[] = [];
  for (const [rating, count] of remaining) {
    for (let k = 0; k < count; k++) {
      const n = filler.length + 1;
      filler.push({
        ...base,
        id: `rev_filler_${String(n)}`,
        rating,
        title: `Reader review ${String(n)}`,
        body: "Filler review so the rating counts and pagination match the wireframe.",
        authorName: `Reader ${String(n).padStart(3, "0")}`,
        customerId: null,
        verifiedPurchase: n % 4 !== 0,
        // Below Sam's 3, so the two drawn reviews lead "Most helpful".
        helpfulCount: n % 3,
        createdAt: new Date(Date.UTC(2026, 7, 31) - n * 86_400_000).toISOString(),
      });
    }
  }
  return [...named, ...filler];
}

const JORDAN_ADDRESS: Address = {
  id: "addr_jordan_home",
  fullName: "Jordan Lee",
  line1: "24 Oak Street",
  city: "Portland",
  state: "OR",
  zip: "97205",
  country: "US",
  isDefault: true,
};

function customer(id: string, name: string, email: string, emailVerified: boolean): CustomerRecord {
  return {
    kind: "customer",
    id,
    email,
    name,
    emailVerified,
    password: SEED_PASSWORD,
    marketingOptIn: false,
    addresses: [],
  };
}

function customers(): CustomerRecord[] {
  const named = [
    { ...customer("cus_jordan", "Jordan Lee", "jordan@example.com", true), addresses: [JORDAN_ADDRESS] },
    customer("cus_maya", "Maya Gray", "maya@example.com", false),
    customer("cus_robin", "Robin Kim", "robin@example.com", false),
    customer("cus_sam", "Sam Rivers", "sam@example.com", true),
  ];
  const filler = Array.from({ length: 216 - named.length }, (_, i) => {
    const n = String(i + 1).padStart(3, "0");
    return customer(`cus_${n}`, `Customer ${n}`, `customer${n}@example.com`, true);
  });
  return [...named, ...filler];
}

function staff(): StaffRecord[] {
  const s = (id: string, name: string, email: string, role: StaffRecord["role"]): StaffRecord => ({
    kind: "staff",
    id,
    name,
    email,
    role,
    password: SEED_PASSWORD,
  });
  return [
    s("stf_alex", "Alex", "alex@store.example", "admin"),
    s("stf_catalog", "Casey", "catalog@store.example", "catalog_editor"),
    s("stf_fulfillment", "Frankie", "fulfillment@store.example", "fulfillment"),
    s("stf_content", "Corey", "content@store.example", "content_editor"),
    s("stf_support", "Sky", "support@store.example", "support"),
  ];
}

const SAMPLE_LINES: Order["lines"] = [
  { sku: "ESV-ST-HC", productName: "ESV Study Bible", variantLabel: "ESV · Hardcover · Standard print", quantity: 1, unitPriceCents: 3900 },
  { sku: "NIV-EV-PB", productName: "NIV Everyday Bible", variantLabel: "NIV · Paperback · Standard print", quantity: 1, unitPriceCents: 2400 },
];

const SAMPLE_TOTALS: Order["totals"] = {
  subtotalCents: 6300,
  shippingCents: 500,
  taxCents: 504,
  discountCents: 0,
  totalCents: 7304,
  shippingMethod: "standard",
  promoCode: null,
};

const { id: _addressId, isDefault: _isDefault, ...JORDAN_SHIPPING } = JORDAN_ADDRESS;

/**
 * Only the orders whose contents the spec fully specifies. BS-10427/26/25/23
 * appear in admin frames; they are seeded in Phase 5 from B06/B07.
 */
function orders(): Order[] {
  const base = {
    customerId: "cus_jordan",
    email: "jordan@example.com",
    lines: SAMPLE_LINES,
    totals: SAMPLE_TOTALS,
    shippingAddress: JORDAN_SHIPPING,
    paymentStatus: "paid" as const,
    paymentMethodLabel: "Visa ending 4242",
    tracking: null,
    remainingBalanceCents: 7304,
    version: 1,
  };
  return [
    { ...base, id: "BS-10428", fulfillmentStatus: "unfulfilled", placedAt: "2026-10-07T10:42:00.000Z", deliveredAt: null },
    { ...base, id: "BS-10392", fulfillmentStatus: "delivered", placedAt: "2026-09-12T15:00:00.000Z", deliveredAt: "2026-09-18T15:00:00.000Z" },
  ];
}

function discounts(): Discount[] {
  const d = (
    code: string,
    kind: Discount["kind"],
    value: number,
    startsAt: string,
    endsAt: string,
    usageCount: number,
    usageLimit: number,
    eligibleCategorySlugs: string[] = [],
  ): Discount => ({
    code,
    kind,
    value,
    startsAt,
    endsAt,
    usageLimit,
    usageCount,
    enabled: true,
    eligibleCategorySlugs,
    minimumSubtotalCents: null,
    version: 1,
  });
  const named = [
    d("READ10", "percent", 10, "2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.000Z", 18, 100),
    d("WELCOME5", "fixed", 500, "2026-11-01T00:00:00.000Z", "2026-11-30T23:59:59.000Z", 0, 200),
    d("STUDY15", "percent", 15, "2026-09-01T00:00:00.000Z", "2026-09-30T23:59:59.000Z", 44, 50, ["study"]),
  ];
  const filler = Array.from({ length: 9 }, (_, i) =>
    d(`FILLER${String(i + 1).padStart(2, "0")}`, "percent", 5, "2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.000Z", i, 100),
  );
  return [...named, ...filler];
}

function content(): ContentPage[] {
  const c = (slug: string, title: string, path: string, status: ContentPage["status"]): ContentPage => ({
    slug,
    title,
    path,
    body: "",
    status,
    updatedAt: "2026-10-01T09:00:00.000Z",
    version: 1,
  });
  const named = [
    c("home", "Home", "/", "published"),
    c("study-bible-category", "Study Bible category", "/categories/study", "published"),
    c("shipping-returns", "Shipping & returns", "/help/shipping-returns", "draft"),
    c("translations", "Translation guide", "/help/translations", "draft"),
  ];
  const filler = Array.from({ length: 5 }, (_, i) =>
    c(`filler-page-${String(i + 1)}`, `Filler page ${String(i + 1)}`, `/help/filler-page-${String(i + 1)}`, "published"),
  );
  return [...named, ...filler];
}

export function createSeed(): Db {
  return {
    products: [...namedProducts(), ...fillerProducts()],
    users: [...customers(), ...staff()],
    sessions: [],
    carts: [],
    wishlists: {},
    orders: orders(),
    checkouts: {},
    paymentIntents: [],
    orderAccess: [],
    returns: [],
    reviews: reviews(),
    discounts: discounts(),
    content: content(),
    stockAdjustments: [],
    outbox: [],
    consumedOneShots: [],
    seq: 1000,
  };
}
