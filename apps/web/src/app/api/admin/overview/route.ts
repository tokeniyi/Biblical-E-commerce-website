import { NextResponse } from "next/server";
import { LOW_STOCK_THRESHOLD, type AdminOverview } from "@your-app/shared";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { orderSummary } from "@/mock-server/services/account";
import { requireStaff, viewerOf } from "@/mock-server/services/auth";
import { getDb } from "@/mock-server/store";

/** B02 dashboard totals (staff only, read-only). */
export const GET = mockHandler((request, { scenario }) => {
  const db = getDb();
  requireStaff(viewerOf(db, request, now(scenario)));
  const paid = db.orders.filter((o) => o.paymentStatus !== "pending_payment");
  const revenue = paid.reduce((n, o) => n + o.totals.totalCents, 0);
  const lowStock = db.products
    .filter((p) => p.status === "published")
    .flatMap((p) =>
      p.variants
        .filter((v) => v.status === "published" && v.stock.available <= LOW_STOCK_THRESHOLD)
        .map((v) => ({ sku: v.sku, productName: p.name, available: v.stock.available })),
    )
    .sort((a, b) => a.available - b.available)
    .slice(0, 8);
  const body: AdminOverview = {
    orderCount: db.orders.length,
    revenueCents: revenue,
    averageOrderCents: paid.length ? Math.round(revenue / paid.length) : 0,
    unfulfilledCount: db.orders.filter((o) => o.fulfillmentStatus === "unfulfilled").length,
    lowStock,
    recentOrders: [...db.orders]
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .slice(0, 6)
      .map((o) => ({ ...orderSummary(o), email: o.email })),
  };
  return NextResponse.json(body);
});
