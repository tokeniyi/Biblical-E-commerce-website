// DELETE-ME-LATER: a customer's own orders (A07, A10, A11). Ownership is
// checked on every read; an order that isn't theirs is the same not_found
// as one that doesn't exist (spec §5.4).
import {
  RETURN_WINDOW_DAYS,
  SHIPPING_METHODS,
  shippingEstimate,
  variantShortLabel,
  type AccountOrderDetail,
  type AccountOrderStatus,
  type AccountOrdersQuery,
  type AccountOrdersResponse,
  type Order,
  type ReorderResult,
} from "@your-app/shared";
import type { Scenario } from "@/lib/dev/scenario-defs";
import { addDays } from "../clock";
import { MockApiError } from "../http";
import type { CartRecord, Db } from "../types";
import { findVariant, isPurchasable } from "./catalog";
import { reviewableLines } from "./reviews";

export const ACCOUNT_ORDERS_PAGE_SIZE = 10;

/** The order whose lifecycle Figma draws at several stages (spec §6). */
export const SNAPSHOT_ORDER_ID = "BS-10428";
/** Delivered snapshot: 30 days later is the 11 Nov return deadline drawn in O12. */
const SNAPSHOT_DELIVERED_AT = "2026-10-12T15:00:00.000Z";

/**
 * Dev toolbar "Order BS-10428 snapshot": shows the sample order as
 * processing, shipped or delivered without changing the stored order.
 */
export function withSnapshot(order: Order, scenario: Pick<Scenario, "order">): Order {
  if (order.id !== SNAPSHOT_ORDER_ID || order.fulfillmentStatus === "cancelled") return order;
  switch (scenario.order) {
    case "shipped":
      return { ...order, fulfillmentStatus: "shipped", deliveredAt: null };
    case "delivered":
      return { ...order, fulfillmentStatus: "delivered", deliveredAt: order.deliveredAt ?? SNAPSHOT_DELIVERED_AT };
    default:
      return order;
  }
}

export type CustomerOrderStatus = Exclude<AccountOrderStatus, "all">;

/** Customer-facing status; payment status is shown beside it, never merged into it. */
export function orderStatus(order: Order): CustomerOrderStatus {
  switch (order.fulfillmentStatus) {
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return "processing";
  }
}

/** Paid orders linked to this customer, newest first, as the snapshot toolbar shows them. */
export function customerOrders(db: Db, customerId: string, scenario: Pick<Scenario, "order">): Order[] {
  return db.orders
    .filter((o) => o.customerId === customerId && o.paymentStatus !== "pending_payment")
    .map((o) => withSnapshot(o, scenario))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

/** A10: status filter, order-number search and pagination, all from the URL. */
export function listCustomerOrders(
  db: Db,
  customerId: string,
  query: AccountOrdersQuery,
  scenario: Pick<Scenario, "order">,
): AccountOrdersResponse {
  const all = customerOrders(db, customerId, scenario);
  const q = query.q.trim().toUpperCase();
  const filtered = all.filter(
    (o) => (query.status === "all" || orderStatus(o) === query.status) && (!q || o.id.toUpperCase().includes(q)),
  );
  const pageSize = ACCOUNT_ORDERS_PAGE_SIZE;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const page = pageCount === 0 ? 1 : Math.min(query.page, pageCount);
  const start = (page - 1) * pageSize;
  return {
    query: { ...query, page },
    items: filtered.slice(start, start + pageSize).map((o) => ({
      id: o.id,
      placedAt: o.placedAt,
      status: orderStatus(o),
      paymentStatus: o.paymentStatus,
      deliveredAt: o.deliveredAt,
      totalCents: o.totals.totalCents,
    })),
    total: filtered.length,
    page,
    pageSize,
    pageCount,
    hasOrders: all.length > 0,
  };
}

/** The customer's order, or not_found (also for someone else's order). */
export function ownOrder(db: Db, customerId: string, id: string, scenario: Pick<Scenario, "order">): Order {
  const order = db.orders.find((o) => o.id === id && o.customerId === customerId && o.paymentStatus !== "pending_payment");
  if (!order) throw new MockApiError("not_found", "We couldn’t find that order.");
  return withSnapshot(order, scenario);
}

/** Returns are for delivered orders, within 30 days of delivery (spec §2). */
export function withinReturnWindow(order: Order, at: Date): boolean {
  if (orderStatus(order) !== "delivered" || !order.deliveredAt) return false;
  return addDays(new Date(order.deliveredAt), RETURN_WINDOW_DAYS).getTime() >= at.getTime();
}

/** A11: read-only paid snapshot; actions follow fulfillment status, checked again when used. */
export function customerOrderDetail(
  db: Db,
  customerId: string,
  id: string,
  scenario: Pick<Scenario, "order">,
  at: Date,
): AccountOrderDetail {
  const order = ownOrder(db, customerId, id, scenario);
  const method = order.totals.shippingMethod ?? "standard";
  const status = orderStatus(order);
  const { version: _version, ...rest } = order;
  return {
    order: {
      ...rest,
      lines: order.lines.map((l) => {
        const found = findVariant(db, l.sku);
        return found ? { ...l, variantLabel: variantShortLabel(found.variant) } : l;
      }),
    },
    status,
    shippingLabel: SHIPPING_METHODS[method].label,
    estimate: shippingEstimate(method, new Date(order.placedAt)).label,
    canCancel: status === "processing" && order.paymentStatus === "paid",
    canReturn: withinReturnWindow(order, at),
    reviewable: reviewableLines(db, customerId, order).map((l) => ({ sku: l.sku, productName: l.productName })),
  };
}

/**
 * A11 Reorder: puts the lines back in the cart at the price paid, so O01
 * compares them with today's price and stock and shows E06 for any
 * difference. Nothing is charged. Editions no longer on sale are skipped.
 */
export function reorder(db: Db, customerId: string, id: string, cart: CartRecord, scenario: Pick<Scenario, "order">): ReorderResult {
  const order = ownOrder(db, customerId, id, scenario);
  const result: ReorderResult = { added: [], skipped: [] };
  for (const line of order.lines) {
    const found = findVariant(db, line.sku);
    if (!isPurchasable(found) || found.variant.stock.available <= 0) {
      result.skipped.push({ sku: line.sku, productName: line.productName });
      continue;
    }
    const existing = cart.lines.find((l) => l.sku === line.sku);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      cart.lines.push({ sku: line.sku, quantity: line.quantity, unitPriceCents: line.unitPriceCents });
    }
    result.added.push({ sku: line.sku, quantity: line.quantity });
  }
  return result;
}
