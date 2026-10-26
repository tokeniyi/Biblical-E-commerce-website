import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_LISTING_QUERY, parseListingQuery, parseReviewsQuery, type ListingQuery } from "@your-app/shared";
import { MockApiError } from "../http";
import { categoryDirectory, listProducts, listReviews, productDetail } from "../services/catalog";
import type { SessionLookup } from "../services/auth";
import { resetDb } from "../store";
import type { Db } from "../types";

let db: Db;
beforeEach(() => {
  db = resetDb();
});

const q = (params = "") => parseListingQuery(new URLSearchParams(params));
const names = (query: ListingQuery, category: string | null = "bibles") =>
  listProducts(db, category, query).items.map((i) => i.name);

function expectApiError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(MockApiError);
    expect((error as MockApiError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe("listing counts drawn in Figma", () => {
  it("C03: 24 Bibles in stock, first page ESV / NIV / KJV, 8 pages of 3", () => {
    const res = listProducts(db, "bibles", DEFAULT_LISTING_QUERY);
    expect(res.total).toBe(24);
    expect(res.pageSize).toBe(3);
    expect(res.pageCount).toBe(8);
    expect(res.items.map((i) => [i.name, i.variant.sku, i.variant.stock.available, i.variant.priceCents])).toEqual([
      ["ESV Study Bible", "ESV-ST-HC", 12, 3900],
      ["NIV Everyday Bible", "NIV-EV-PB", 26, 2400],
      ["KJV Large Print Bible", "KJV-LP-LL", 8, 3200],
    ]);
  });

  it("C04: 18 results for “bible”, same first page", () => {
    const res = listProducts(db, null, q("q=bible"));
    expect(res.total).toBe(18);
    expect(res.category).toBeNull();
    expect(res.items.map((i) => i.name)).toEqual(["ESV Study Bible", "NIV Everyday Bible", "KJV Large Print Bible"]);
  });

  it("C02: purpose counts 24 / 18 / 12 / 16 come from the server", () => {
    expect(categoryDirectory(db).purposes.map((p) => [p.name, p.count])).toEqual([
      ["Study Bibles", 24],
      ["Devotional Bibles", 18],
      ["Children’s Bibles", 12],
      ["Journaling Bibles", 16],
    ]);
  });

  it("C03 hint: NLT Children’s Bible ($22.00) is hidden by “In stock only”", () => {
    expect(listProducts(db, "bibles", DEFAULT_LISTING_QUERY).soldOutExample).toEqual({
      name: "NLT Children’s Bible",
      priceCents: 2200,
    });
    // Including sold-out editions lists it, so the hint goes away.
    const all = listProducts(db, "bibles", q("availability=all"));
    // 24 in stock + NLT + 16 sold-out filler; NLT follows the three named in-stock Bibles.
    expect(all.total).toBe(41);
    expect(names(q("availability=all&page=2"))[0]).toBe("NLT Children’s Bible");
    expect(all.soldOutExample).toBeNull();
  });

  it("offers the four drawn translations for English Bibles", () => {
    expect(listProducts(db, "bibles", DEFAULT_LISTING_QUERY).translations).toEqual(["ESV", "KJV", "NIV", "NLT"]);
  });
});

describe("facets", () => {
  it("filters by translation (any of)", () => {
    const res = listProducts(db, "bibles", q("translation=ESV,NLT&availability=all"));
    expect(res.items.every((i) => ["ESV", "NLT"].includes(i.variant.translation))).toBe(true);
    expect(res.total).toBeGreaterThan(0);
  });

  it("filters by Bible type and category together", () => {
    const study = listProducts(db, "study", DEFAULT_LISTING_QUERY);
    const studyChildren = listProducts(db, "study", q("type=children"));
    expect(studyChildren.total).toBeLessThan(study.total);
  });

  it("large print is a variant property: the card shows the matching variant", () => {
    expect(names(q("largePrint=true"))).toEqual(["KJV Large Print Bible"]);
    expect(names(DEFAULT_LISTING_QUERY, "large-print")).toEqual(["KJV Large Print Bible"]);
  });

  it("binding picks the matching variant for two-binding products", () => {
    const res = listProducts(db, "bibles", q("binding=Paperback"));
    expect(res.items.every((i) => i.variant.binding === "Paperback")).toBe(true);
  });

  it("price range is in whole dollars, inclusive", () => {
    const res = listProducts(db, "bibles", q("price=24-32&availability=all"));
    for (const item of res.items) {
      expect(item.variant.priceCents).toBeGreaterThanOrEqual(2400);
      expect(item.variant.priceCents).toBeLessThanOrEqual(3200);
    }
    expect(res.items.map((i) => i.name)).toContain("NIV Everyday Bible");
  });

  it("language: Spanish editions only appear when asked for", () => {
    expect(listProducts(db, "bibles", q("language=es")).items.every((i) => i.name.includes("Biblia"))).toBe(true);
    expect(listProducts(db, "bibles", DEFAULT_LISTING_QUERY).items.some((i) => i.name.includes("Biblia"))).toBe(false);
    expect(listProducts(db, "bibles", q("language=all")).total).toBe(28);
  });

  it("never lists drafts", () => {
    const all = listProducts(db, "bibles", q("language=all&availability=all&page=1"));
    expect(all.total).toBe(45);
    expect(names(q("q=journaling&availability=all"))).not.toContain("ESV Journaling Bible");
  });

  it("E02: zero matches returns an empty page, not an error", () => {
    const res = listProducts(db, null, q("q=spanish+study&translation=ESV&binding=Hardcover"));
    expect(res).toMatchObject({ total: 0, pageCount: 0, page: 1, items: [] });
  });

  it("search matches SKU and ISBN too", () => {
    expect(names(q("q=ESV-ST-HC"), null)).toEqual(["ESV Study Bible"]);
    expect(names(q("q=978-1-00000-001-1"), null)).toEqual(["ESV Study Bible"]);
  });

  it("rejects an unknown category with not_found (E19)", () => {
    expectApiError(() => listProducts(db, "missing", DEFAULT_LISTING_QUERY), "not_found");
  });
});

describe("sort and pagination", () => {
  it("sorts by price both ways", () => {
    const asc = listProducts(db, "bibles", q("sort=price-asc")).items.map((i) => i.variant.priceCents);
    const desc = listProducts(db, "bibles", q("sort=price-desc")).items.map((i) => i.variant.priceCents);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(desc[0]).toBeGreaterThan(asc[0] ?? 0);
  });

  it("sorts rated products first by rating", () => {
    expect(listProducts(db, "bibles", q("sort=rating")).items[0]?.name).toBe("ESV Study Bible");
  });

  it("pages through all 24 without repeats", () => {
    const seen: string[] = [];
    for (let page = 1; page <= 8; page++) seen.push(...names(q(`page=${String(page)}`)));
    expect(seen).toHaveLength(24);
    expect(new Set(seen).size).toBe(24);
  });

  it("clamps a page past the end to the last page", () => {
    const res = listProducts(db, "bibles", q("page=99"));
    expect(res.page).toBe(8);
    expect(res.query.page).toBe(8);
    expect(res.items).toHaveLength(3);
  });
});

describe("product detail", () => {
  it("returns the ESV Study Bible with its draft variant visible for E12", () => {
    const detail = productDetail(db, "esv-study-bible");
    expect(detail.product.variants.map((v) => [v.sku, v.status])).toEqual([
      ["ESV-ST-HC", "published"],
      ["ESV-ST-LL-LP", "draft"],
    ]);
    expect(detail.category).toEqual({ slug: "study", name: "Study Bibles" });
    expect(detail.topReview).toMatchObject({ authorName: "Taylor M.", helpfulCount: 8, variantLabel: "Hardcover / Standard" });
    expect(detail.topReview).not.toHaveProperty("customerId");
  });

  it("hides draft products and unknown slugs behind the same 404", () => {
    expectApiError(() => productDetail(db, "esv-journaling-bible"), "not_found");
    expectApiError(() => productDetail(db, "missing"), "not_found");
  });
});

const signedOut: SessionLookup = { status: "none" };
function customer(userId: string): SessionLookup {
  return {
    status: "active",
    session: { kind: "customer", userId, email: "x@example.com", name: "X", emailVerified: true, expiresAt: "2026-10-07T12:42:00.000Z" },
  };
}
const rq = (params = "") => parseReviewsQuery(new URLSearchParams(params));

describe("reviews (C06)", () => {
  it("shows 124 reviews two per page, most helpful first", () => {
    const res = listReviews(db, "esv-study-bible", rq(), signedOut);
    expect(res.total).toBe(124);
    expect(res.pageSize).toBe(2);
    expect(res.pageCount).toBe(62);
    expect(res.items.map((r) => r.authorName)).toEqual(["Taylor M.", "Sam R."]);
    expect(res.rating).toEqual({ average: 4.8, count: 124, histogram: [98, 19, 5, 1, 1] });
  });

  it("filters by star rating and the counts match the histogram", () => {
    const counts = ["5", "4", "3", "2", "1"].map((r) => listReviews(db, "esv-study-bible", rq(`rating=${r}`), signedOut).total);
    expect(counts).toEqual([98, 19, 5, 1, 1]);
    expect(listReviews(db, "esv-study-bible", rq("rating=4"), signedOut).items[0]?.authorName).toBe("Sam R.");
  });

  it("sorts lowest first", () => {
    expect(listReviews(db, "esv-study-bible", rq("sort=lowest"), signedOut).items[0]?.rating).toBe(1);
  });

  it("does not show pending reviews", () => {
    const pending = db.reviews.at(0);
    if (pending) pending.status = "pending";
    expect(listReviews(db, "esv-study-bible", rq(), signedOut).total).toBe(123);
  });

  it("eligibility: signed out → sign in; Jordan received ESV-ST-HC in BS-10392 → eligible", () => {
    expect(listReviews(db, "esv-study-bible", rq(), signedOut).eligibility).toEqual({ status: "signed-out" });
    expect(listReviews(db, "esv-study-bible", rq(), customer("cus_jordan")).eligibility).toEqual({
      status: "eligible",
      orderId: "BS-10392",
      sku: "ESV-ST-HC",
    });
  });

  it("eligibility: an undelivered order is not enough; one review per product", () => {
    expect(listReviews(db, "kjv-large-print-bible", rq(), customer("cus_jordan")).eligibility).toEqual({
      status: "not-delivered",
    });
    // Sam R. already reviewed the ESV Study Bible.
    expect(listReviews(db, "esv-study-bible", rq(), customer("cus_sam")).eligibility).toEqual({
      status: "already-reviewed",
    });
  });

  it("an expired session reads as signed out", () => {
    expect(listReviews(db, "esv-study-bible", rq(), { status: "expired" }).eligibility.status).toBe("signed-out");
  });
});
