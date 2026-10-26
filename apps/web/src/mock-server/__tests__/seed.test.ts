import { describe, expect, it } from "vitest";
import { OrderSchema, ProductSchema, isLowStock, taxOnCents } from "@your-app/shared";
import { createSeed } from "../seed";
import { getDb, resetDb } from "../store";

const db = createSeed();
const variants = db.products.flatMap((p) => p.variants);
const variant = (sku: string) => variants.find((v) => v.sku === sku);

describe("seed totals (spec §6)", () => {
  it("has 48 products and 64 variants", () => {
    expect(db.products).toHaveLength(48);
    expect(variants).toHaveLength(64);
  });

  it("has 216 customers and one staff user per role", () => {
    expect(db.users.filter((u) => u.kind === "customer")).toHaveLength(216);
    const roles = db.users.flatMap((u) => (u.kind === "staff" ? [u.role] : [])).sort();
    expect(roles).toEqual(["admin", "catalog_editor", "content_editor", "fulfillment", "support"]);
  });

  it("has 12 discounts and 9 content records", () => {
    expect(db.discounts).toHaveLength(12);
    expect(db.content).toHaveLength(9);
  });

  it("matches the B02 counts: 3 draft products, 2 low-stock variants", () => {
    expect(db.products.filter((p) => p.status === "draft")).toHaveLength(3);
    const published = variants.filter((v) => v.status === "published");
    expect(published.filter((v) => isLowStock(v.stock.available))).toHaveLength(2);
  });

  it("has unique slugs and SKUs", () => {
    expect(new Set(db.products.map((p) => p.slug)).size).toBe(db.products.length);
    expect(new Set(variants.map((v) => v.sku)).size).toBe(variants.length);
  });
});

describe("seed fixtures match the wireframes", () => {
  it("computes available = on-hand - reserved", () => {
    for (const v of variants) expect(v.stock.available).toBe(v.stock.onHand - v.stock.reserved);
    expect(variant("ESV-ST-HC")?.stock).toEqual({ onHand: 15, reserved: 3, available: 12 });
    expect(variant("NIV-EV-PB")?.stock.available).toBe(26);
    expect(variant("KJV-LP-LL")?.stock.available).toBe(8);
    expect(variant("NLT-CH-HC")?.stock.available).toBe(0);
  });

  it("keeps the E12 leather-look large print variant in draft", () => {
    expect(variant("ESV-ST-LL-LP")?.status).toBe("draft");
  });

  it("prices BS-10428 at $63 + $5 + $5.04 = $73.04", () => {
    const order = db.orders.find((o) => o.id === "BS-10428");
    const subtotal = order?.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0) ?? 0;
    expect(subtotal).toBe(6300);
    expect(taxOnCents(subtotal)).toBe(order?.totals.taxCents);
    expect(order?.totals.totalCents).toBe(7304);
  });

  it("produces records that satisfy the shared contract", () => {
    for (const p of db.products) expect(ProductSchema.safeParse(p).success).toBe(true);
    for (const o of db.orders) expect(OrderSchema.safeParse(o).success).toBe(true);
  });
});

describe("store", () => {
  it("resetDb discards mutations", () => {
    getDb().orders.length = 0;
    expect(resetDb().orders.length).toBeGreaterThan(0);
    expect(getDb().orders.length).toBeGreaterThan(0);
  });
});
