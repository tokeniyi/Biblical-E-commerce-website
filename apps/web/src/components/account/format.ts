import type { AccountOrderRow } from "@your-app/shared";

const PLACED = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "7 Oct 2026" */
export function placedDate(iso: string): string {
  return PLACED.format(new Date(iso));
}

/** "18 Sep" */
export function shortDate(iso: string): string {
  return SHORT.format(new Date(iso));
}

export function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

const STATUS_LABEL: Record<AccountOrderRow["status"], string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function statusLabel(status: AccountOrderRow["status"]): string {
  return STATUS_LABEL[status];
}

const PAYMENT_LABEL: Record<AccountOrderRow["paymentStatus"], string> = {
  pending_payment: "Payment pending",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

/**
 * "Processing · Paid", "Delivered · 18 Sep" (A10). Fulfillment and payment
 * stay two facts side by side; a delivered order shows when it arrived.
 */
export function orderStatusLine(row: Pick<AccountOrderRow, "status" | "paymentStatus" | "deliveredAt">): string {
  const second = row.status === "delivered" && row.deliveredAt ? shortDate(row.deliveredAt) : PAYMENT_LABEL[row.paymentStatus];
  return `${statusLabel(row.status)} · ${second}`;
}

export function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}
