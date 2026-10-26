// DELETE-ME-LATER: fixtures that make the wireframes render as drawn (spec §6).
import type { Address, ContentPage, Discount, Order, Product, Variant } from "@your-app/shared";
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
  status?: Variant["status"];
};

function variant(productSlug: string, v: VariantSeed): Variant {
  return {
    sku: v.sku,
    productSlug,
    translation: v.translation,
    binding: v.binding,
    printSize: v.printSize,
    priceCents: v.priceCents,
    status: v.status ?? "published",
    stock: { onHand: v.onHand, reserved: v.reserved, available: v.onHand - v.reserved },
    version: 1,
  };
}

function product(
  slug: string,
  name: string,
  categorySlugs: string[],
  variants: VariantSeed[],
  extra: Partial<Pick<Product, "status" | "rating" | "description">> = {},
): Product {
  return {
    slug,
    name,
    description: extra.description ?? "",
    categorySlugs,
    language: "en",
    status: extra.status ?? "published",
    variants: variants.map((v) => variant(slug, v)),
    rating: extra.rating ?? null,
    version: 1,
  };
}

/** The named products from the Figma frames. */
function namedProducts(): Product[] {
  return [
    product(
      "esv-study-bible",
      "ESV Study Bible",
      ["study"],
      [
        { sku: "ESV-ST-HC", translation: "ESV", binding: "Hardcover", printSize: "Standard print", priceCents: 3900, onHand: 15, reserved: 3 },
        // Draft leather-look large print: drives E12 (variant unavailable).
        { sku: "ESV-ST-LL-LP", translation: "ESV", binding: "Leather-look", printSize: "Large print", priceCents: 4900, onHand: 0, reserved: 0, status: "draft" },
      ],
      { rating: { average: 4.8, count: 124, histogram: [98, 19, 5, 1, 1] } },
    ),
    product("niv-everyday-bible", "NIV Everyday Bible", ["devotional"], [
      { sku: "NIV-EV-PB", translation: "NIV", binding: "Paperback", printSize: "Standard print", priceCents: 2400, onHand: 28, reserved: 2 },
    ]),
    product("kjv-large-print-bible", "KJV Large Print Bible", ["large-print"], [
      { sku: "KJV-LP-LL", translation: "KJV", binding: "Leather-look", printSize: "Large print", priceCents: 3200, onHand: 9, reserved: 1 },
    ]),
    product("nlt-childrens-bible", "NLT Children’s Bible", ["children"], [
      { sku: "NLT-CH-HC", translation: "NLT", binding: "Hardcover", printSize: "Standard print", priceCents: 2200, onHand: 0, reserved: 0 },
    ]),
    product(
      "esv-journaling-bible",
      "ESV Journaling Bible",
      ["devotional"],
      [{ sku: "ESV-JR-PB", translation: "ESV", binding: "Paperback", printSize: "Standard print", priceCents: 2800, onHand: 0, reserved: 0, status: "draft" }],
      { status: "draft" },
    ),
  ];
}

const FILLER_TRANSLATIONS = ["ESV", "NIV", "KJV", "NLT", "CSB", "NKJV", "NASB"] as const;
const FILLER_STYLES = ["Thinline", "Compact", "Reference", "Gift", "Pew", "Premium"] as const;
const FILLER_CATEGORIES = ["study", "devotional", "children", "large-print"] as const;
const BINDINGS = ["Hardcover", "Paperback", "Leather-look"] as const;

/**
 * Deterministic filler so catalog totals match the wireframes: 48 products
 * and 64 variants overall, 3 draft products and 2 low-stock variants (B02).
 * Listing/search counts (24 / 18) are tuned in Phase 1 with the search logic.
 */
function fillerProducts(): Product[] {
  const products: Product[] = [];
  for (let i = 0; i < 43; i++) {
    const translation = FILLER_TRANSLATIONS[i % FILLER_TRANSLATIONS.length] ?? "ESV";
    const style = FILLER_STYLES[Math.floor(i / FILLER_TRANSLATIONS.length) % FILLER_STYLES.length] ?? "Gift";
    const category = FILLER_CATEGORIES[i % FILLER_CATEGORIES.length] ?? "study";
    const n = String(i + 1).padStart(2, "0");
    const slug = `${translation.toLowerCase()}-${style.toLowerCase()}-bible-${n}`;
    const base = `${translation}-${style.slice(0, 2).toUpperCase()}${n}`;
    // 15 products get a second binding: 43 + 15 + 6 named = 64 variants.
    const bindings = i < 15 ? BINDINGS.slice(0, 2) : BINDINGS.slice(i % 3, (i % 3) + 1);
    const isDraft = i === 41 || i === 42;
    const isLowStock = i === 7;
    products.push(
      product(
        slug,
        `${translation} ${style} Bible`,
        [category],
        bindings.map((binding, j) => ({
          sku: `${base}-${binding.slice(0, 2).toUpperCase()}`,
          translation,
          binding,
          printSize: "Standard print",
          priceCents: 1800 + ((i * 7 + j * 5) % 30) * 100,
          onHand: isDraft ? 0 : isLowStock && j === 0 ? 6 : 20 + (i % 10),
          reserved: isDraft ? 0 : 1,
          status: isDraft ? "draft" : "published",
        })),
        { status: isDraft ? "draft" : "published" },
      ),
    );
  }
  return products;
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
    paymentIntents: [],
    returns: [],
    reviews: [],
    discounts: discounts(),
    content: content(),
    stockAdjustments: [],
    outbox: [],
    consumedOneShots: [],
    seq: 1000,
  };
}
