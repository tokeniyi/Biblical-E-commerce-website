import { describe, expect, it } from "vitest";
import { AddressInputSchema } from "../address.schema";
import { DiscountInputSchema } from "../discount.schema";
import { ErrorEnvelopeSchema } from "../error.schema";
import { QuoteSchema } from "../quote.schema";
import { ReviewInputSchema } from "../review.schema";
import { SessionSchema } from "../session.schema";

const address = {
  fullName: "Jordan Lee",
  line1: "24 Oak Street",
  city: "Portland",
  state: "OR",
  zip: "97205",
  country: "US",
};

describe("AddressInputSchema", () => {
  it("accepts the seeded default address", () => {
    expect(AddressInputSchema.safeParse(address).success).toBe(true);
  });

  it("rejects a malformed ZIP (E07)", () => {
    const result = AddressInputSchema.safeParse({ ...address, zip: "9720" });
    expect(result.success).toBe(false);
  });

  it("rejects non-US countries", () => {
    expect(AddressInputSchema.safeParse({ ...address, country: "NG" }).success).toBe(false);
  });
});

const discount = {
  code: "read10",
  kind: "percent",
  value: 10,
  startsAt: "2026-10-01T00:00:00.000Z",
  endsAt: "2026-10-31T23:59:59.000Z",
  usageLimit: 100,
  enabled: true,
  eligibleCategorySlugs: [],
  minimumSubtotalCents: null,
};

describe("DiscountInputSchema", () => {
  it("upper-cases the code", () => {
    expect(DiscountInputSchema.parse(discount).code).toBe("READ10");
  });

  it("rejects a percent above 100 (E24)", () => {
    const result = DiscountInputSchema.safeParse({ ...discount, value: 120 });
    expect(result.success).toBe(false);
  });

  it("allows a fixed amount above 100 cents", () => {
    const result = DiscountInputSchema.safeParse({ ...discount, kind: "fixed", value: 500 });
    expect(result.success).toBe(true);
  });

  it("rejects an end date that is not after the start (E24)", () => {
    const result = DiscountInputSchema.safeParse({ ...discount, endsAt: discount.startsAt });
    expect(result.success).toBe(false);
  });
});

describe("ReviewInputSchema", () => {
  it("enforces the 10-character minimum", () => {
    const result = ReviewInputSchema.safeParse({ rating: 5, title: "Great", body: "Too short" });
    expect(result.success).toBe(false);
  });

  it("accepts a review in range", () => {
    const body = "Clear notes and sturdy binding.";
    expect(ReviewInputSchema.safeParse({ rating: 5, title: "Great", body }).success).toBe(true);
  });
});

describe("QuoteSchema", () => {
  it("rejects a positive discount", () => {
    const result = QuoteSchema.safeParse({
      lines: [],
      subtotalCents: 6300,
      shippingCents: 500,
      taxCents: 504,
      discountCents: 100,
      totalCents: 7304,
      shippingMethod: "standard",
      promoCode: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("ErrorEnvelopeSchema", () => {
  it("accepts an edge-state code with field errors", () => {
    const result = ErrorEnvelopeSchema.safeParse({
      error: { code: "validation_failed", message: "Check the form", fieldErrors: { zip: ["Bad"] } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown code", () => {
    const result = ErrorEnvelopeSchema.safeParse({ error: { code: "teapot", message: "x" } });
    expect(result.success).toBe(false);
  });
});

describe("SessionSchema", () => {
  it("rejects a staff session with an unknown role", () => {
    const result = SessionSchema.safeParse({
      kind: "staff",
      userId: "stf_1",
      email: "alex@store.example",
      name: "Alex",
      role: "owner",
      expiresAt: "2026-10-07T12:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
