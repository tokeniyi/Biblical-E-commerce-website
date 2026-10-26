import { describe, expect, it } from "vitest";
import {
  DEFAULT_LISTING_QUERY,
  clearListingFilters,
  listingQueryToParams,
  parseListingQuery,
  parseReviewsQuery,
  reviewsQueryToParams,
  updateListingQuery,
} from "../catalog.schema";

describe("parseListingQuery", () => {
  it("treats absent params as the C03 defaults (English, in stock, relevance, page 1)", () => {
    expect(parseListingQuery(new URLSearchParams())).toEqual(DEFAULT_LISTING_QUERY);
  });

  it("reads every facet from the URL", () => {
    const query = parseListingQuery(
      new URLSearchParams(
        "q=study&translation=ESV,KJV&type=study&language=all&binding=Hardcover&price=10-40&availability=all&largePrint=true&sort=price-desc&page=3",
      ),
    );
    expect(query).toEqual({
      q: "study",
      translation: ["ESV", "KJV"],
      type: ["study"],
      language: "all",
      binding: "Hardcover",
      priceMin: 10,
      priceMax: 40,
      availability: "all",
      largePrint: true,
      sort: "price-desc",
      page: 3,
    });
  });

  it("accepts Next's searchParams record shape", () => {
    expect(parseListingQuery({ translation: ["NIV", "ignored"], page: "2" })).toMatchObject({
      translation: ["NIV"],
      page: 2,
    });
  });

  it("falls back to defaults for malformed values instead of failing", () => {
    const query = parseListingQuery(
      new URLSearchParams("language=fr&sort=cheapest&availability=maybe&page=-2&price=abc-&largePrint=yes"),
    );
    expect(query).toEqual(DEFAULT_LISTING_QUERY);
  });

  it("allows an open-ended price range", () => {
    expect(parseListingQuery(new URLSearchParams("price=-25"))).toMatchObject({ priceMin: null, priceMax: 25 });
    expect(parseListingQuery(new URLSearchParams("price=25-"))).toMatchObject({ priceMin: 25, priceMax: null });
  });
});

describe("listingQueryToParams", () => {
  it("omits defaults so the bare category URL is the default view", () => {
    expect(listingQueryToParams(DEFAULT_LISTING_QUERY).toString()).toBe("");
  });

  it("round-trips through parse", () => {
    const query = {
      ...DEFAULT_LISTING_QUERY,
      q: "bible",
      translation: ["ESV"],
      availability: "all" as const,
      priceMax: 30,
      page: 2,
    };
    expect(parseListingQuery(listingQueryToParams(query))).toEqual(query);
  });
});

describe("updateListingQuery", () => {
  const onPage3 = { ...DEFAULT_LISTING_QUERY, q: "bible", page: 3 };

  it("resets to page 1 when a facet changes (C03)", () => {
    expect(updateListingQuery(onPage3, { translation: ["ESV"] }).page).toBe(1);
  });

  it("resets to page 1 when the sort changes, keeping filters (C04)", () => {
    const next = updateListingQuery({ ...onPage3, translation: ["NIV"] }, { sort: "rating" });
    expect(next).toMatchObject({ page: 1, translation: ["NIV"], q: "bible", sort: "rating" });
  });

  it("keeps the requested page for pagination", () => {
    expect(updateListingQuery(onPage3, { page: 4 }).page).toBe(4);
  });
});

describe("clearListingFilters", () => {
  it("returns to the defaults but keeps the search text (E02: never erase the query silently)", () => {
    const busy = { ...DEFAULT_LISTING_QUERY, q: "spanish study", translation: ["ESV"], binding: "Hardcover", page: 2 };
    expect(clearListingFilters(busy)).toEqual({ ...DEFAULT_LISTING_QUERY, q: "spanish study" });
  });
});

describe("reviews query", () => {
  it("defaults to all ratings, most helpful, page 1", () => {
    expect(parseReviewsQuery(new URLSearchParams())).toEqual({ rating: "all", sort: "helpful", page: 1 });
    expect(reviewsQueryToParams({ rating: "all", sort: "helpful", page: 1 }).toString()).toBe("");
  });

  it("ignores unknown ratings and sorts", () => {
    expect(parseReviewsQuery(new URLSearchParams("rating=6&sort=random&page=2"))).toEqual({
      rating: "all",
      sort: "helpful",
      page: 2,
    });
  });
});
