import { describe, expect, it } from "vitest";
import { formatCents, isLowStock, taxOnCents } from "../rules";

describe("taxOnCents", () => {
  it("matches the BS-10428 sample: 8% of $63.00 is $5.04", () => {
    expect(taxOnCents(6300)).toBe(504);
  });

  it("matches the E06 sample: 8% of $64.00 is $5.12", () => {
    expect(taxOnCents(6400)).toBe(512);
  });

  it("matches the O12 sample: 8% of $39.00 is $3.12", () => {
    expect(taxOnCents(3900)).toBe(312);
  });
});

describe("isLowStock", () => {
  it("treats 8 available as low (KJV sample)", () => {
    expect(isLowStock(8)).toBe(true);
  });

  it("does not treat sold-out as low stock", () => {
    expect(isLowStock(0)).toBe(false);
  });

  it("does not treat 9 as low stock", () => {
    expect(isLowStock(9)).toBe(false);
  });
});

describe("formatCents", () => {
  it("formats USD", () => {
    expect(formatCents(7304)).toBe("$73.04");
  });
});
