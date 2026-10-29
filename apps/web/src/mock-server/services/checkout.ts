// DELETE-ME-LATER: cart pricing, checkout (O01–O07), simulated payments and
// order creation (O08). The real API keeps the same contract and rules;
// payments move to Paystack/Stripe with verified webhooks (spec §10).
import {
  AddressInputSchema,
  DeliveryInputSchema,
  PaymentInputSchema,
  SHIPPING_METHODS,
  formatCents,
  shippingEstimate,
  variantShortLabel,
  type Cart,
  type CartChange,
  type CartLine,
  type CheckoutView,
  type CheckoutViewer,
  type Discount,
  type Order,
  type OrderConfirmation,
  type PaymentIntentView,
  type PromoRejection,
  type Quote,
  type ShippingMethodId,
  type ShippingOption,
} from "@your-app/shared";
import type { Scenario } from "@/lib/dev/scenario-defs";
import { addMinutes } from "../clock";
import { MockApiError } from "../http";
import { sendEmail } from "../outbox";
import type { ScenarioContext } from "../scenarios";
import { nextId } from "../store";
import type { CustomerRecord, Db, PaymentIntentRecord } from "../types";
import type { SessionLookup } from "./auth";
import { cartView } from "./cart";
import { findCategory, findVariant, isPurchasable } from "./catalog";
import { computeQuote, eligibleGoodsCents, type PricedLine } from "./pricing";

/** How long the paying browser may reopen its guest confirmation (O08). */
export const ORDER_ACCESS_MINUTES = 60;

const SHIPPING_UNAVAILABLE = "We can’t ship to this address";

// ---------------------------------------------------------------- pricing

function priced(db: Db, lines: readonly CartLine[]): PricedLine[] {
  return lines.map((l) => ({ ...l, categorySlugs: findVariant(db, l.sku)?.product.categorySlugs ?? [] }));
}

/** Server truth for a SKU: drafts and unknown SKUs have nothing available. */
function current(db: Db, sku: string): { available: number; priceCents: number } {
  const found = findVariant(db, sku);
  const priceCents = found?.variant.priceCents ?? 0;
  return { available: isPurchasable(found) ? found.variant.stock.available : 0, priceCents };
}

// ------------------------------------------------------------------ promo

function promoError(reason: PromoRejection, message: string): MockApiError {
  return new MockApiError("promo_invalid", message, { code: [message] }, { reason });
}

const EXPIRED = "This code has expired. No discount was applied.";
const NOT_RECOGNIZED = "Code not recognized.";

function ineligibleMessage(discount: Discount | undefined): string {
  if (discount && discount.eligibleCategorySlugs.length > 0) {
    const names = discount.eligibleCategorySlugs.map((s) => findCategory(s)?.name ?? s).join(", ");
    return `This code applies only to ${names}. No discount was applied.`;
  }
  if (discount?.minimumSubtotalCents) {
    return `This code needs at least ${formatCents(discount.minimumSubtotalCents)} of eligible items. No discount was applied.`;
  }
  return "This code doesn’t apply to the items in your cart. No discount was applied.";
}

/**
 * Server check of code, dates, usage and cart scope (E08). Scheduled and
 * disabled codes read as "not recognized" so they don't leak upcoming offers.
 */
export function validatePromo(
  db: Db,
  rawCode: string,
  lines: readonly PricedLine[],
  at: Date,
  forced: Scenario["promo"] = "normal",
): Discount {
  const code = rawCode.trim().toUpperCase();
  const discount = db.discounts.find((d) => d.code === code);
  if (forced === "invalid") throw promoError("invalid", NOT_RECOGNIZED);
  if (forced === "expired") throw promoError("expired", EXPIRED);
  if (forced === "ineligible") throw promoError("ineligible", ineligibleMessage(discount));
  if (!discount || !discount.enabled || at < new Date(discount.startsAt)) throw promoError("invalid", NOT_RECOGNIZED);
  const usedUp = discount.usageLimit !== null && discount.usageCount >= discount.usageLimit;
  if (at > new Date(discount.endsAt) || usedUp) throw promoError("expired", EXPIRED);
  const eligible = eligibleGoodsCents(discount, lines);
  if (eligible === 0 || (discount.minimumSubtotalCents !== null && eligible < discount.minimumSubtotalCents)) {
    throw promoError("ineligible", ineligibleMessage(discount));
  }
  return discount;
}

export function applyPromo(db: Db, cart: Cart, code: string, at: Date, forced: Scenario["promo"]): void {
  if (cart.lines.length === 0) throw promoError("ineligible", ineligibleMessage(undefined));
  const discount = validatePromo(db, code, priced(db, cart.lines), at, forced);
  cart.promoCode = discount.code;
}

export function removePromo(cart: Cart): void {
  cart.promoCode = null;
}

/** The applied discount if it still validates for these lines; otherwise none. */
function activeDiscount(db: Db, cart: Cart, lines: readonly PricedLine[], at: Date): Discount | null {
  if (!cart.promoCode) return null;
  try {
    return validatePromo(db, cart.promoCode, lines, at);
  } catch {
    return null;
  }
}

export function quoteFor(db: Db, cart: Cart, lines: readonly CartLine[], at: Date): Quote {
  const pricedLines = priced(db, lines);
  return computeQuote({
    lines: pricedLines,
    shippingMethod: db.checkouts[cart.token]?.shippingMethod ?? null,
    discount: activeDiscount(db, cart, pricedLines, at),
  });
}

// ------------------------------------------------------------ E06 changes

/** Lines whose server stock or price no longer matches the cart (E06). */
export function cartChanges(db: Db, cart: Cart): CartChange[] {
  return cart.lines.flatMap((line) => {
    const now = current(db, line.sku);
    const stockShort = now.available < line.quantity;
    const priceMoved = now.priceCents !== line.unitPriceCents;
    if (!stockShort && !priceMoved) return [];
    return [
      {
        sku: line.sku,
        productName: findVariant(db, line.sku)?.product.name ?? line.sku,
        cartQuantity: line.quantity,
        cartUnitPriceCents: line.unitPriceCents,
        available: stockShort ? now.available : null,
        currentPriceCents: priceMoved ? now.priceCents : null,
      },
    ];
  });
}

/** The cart after accepting every change: quantities clamped, prices current, sold-out lines dropped. */
export function reconciledLines(db: Db, cart: Cart): CartLine[] {
  return cart.lines.flatMap((line) => {
    const now = current(db, line.sku);
    const quantity = Math.min(line.quantity, now.available);
    return quantity > 0 ? [{ sku: line.sku, quantity, unitPriceCents: now.priceCents }] : [];
  });
}

/** E06 "Accept & update": the customer explicitly takes the server's stock and prices. */
export function acceptChanges(db: Db, cart: Cart): void {
  cart.lines = reconciledLines(db, cart);
}

/**
 * Dev "Quote drift" (one-shot): changes the catalog itself, as if stock
 * sold or a price moved while the customer shopped. Stock drift leaves one
 * fewer than the first line's quantity; price drift adds $1 to the second
 * line (the first if alone). With ESV ×2 + NIV ×1 that is the Figma E06
 * sample: "Only 1 available", NIV $24 → $25, $74.12.
 */
export function applyQuoteDrift(db: Db, cart: Cart | undefined, ctx: ScenarioContext): void {
  const drift = ctx.scenario.quote;
  if (drift === "none" || !cart || cart.lines.length === 0) return;
  const first = cart.lines.at(0);
  const second = cart.lines.at(1);
  if (first && (drift === "stock" || drift === "both")) {
    const variant = findVariant(db, first.sku)?.variant;
    if (variant) {
      variant.stock.available = Math.max(0, first.quantity - 1);
      variant.stock.onHand = variant.stock.available + variant.stock.reserved;
    }
  }
  const priceTarget = second ?? first;
  if (priceTarget && (drift === "price" || drift === "both")) {
    const variant = findVariant(db, priceTarget.sku)?.variant;
    if (variant) variant.priceCents = priceTarget.unitPriceCents + 100;
  }
  ctx.consume("quote");
}

// ------------------------------------------------------------ the view

function customerOf(db: Db, viewer: SessionLookup): CustomerRecord | null {
  if (viewer.status !== "active" || viewer.session.kind !== "customer") return null;
  const user = db.users.find((u) => u.id === viewer.session.userId);
  return user?.kind === "customer" ? user : null;
}

function checkoutViewer(db: Db, viewer: SessionLookup): CheckoutViewer {
  const customer = customerOf(db, viewer);
  return customer
    ? { kind: "customer", name: customer.name, email: customer.email, savedAddresses: customer.addresses }
    : { kind: "guest" };
}

function coverageOf(db: Db, cart: Cart, scenario: Scenario): CheckoutView["coverage"] {
  if (!db.checkouts[cart.token]) return "unknown";
  return scenario.shipping === "unsupported" ? "unsupported" : "supported";
}

function shippingOptions(db: Db, cart: Cart, scenario: Scenario, at: Date): ShippingOption[] {
  if (coverageOf(db, cart, scenario) !== "supported") return [];
  const pricedLines = priced(db, cart.lines);
  const discount = activeDiscount(db, cart, pricedLines, at);
  return (Object.keys(SHIPPING_METHODS) as ShippingMethodId[]).map((id) => {
    const { label, year } = shippingEstimate(id, at);
    return {
      id,
      label: SHIPPING_METHODS[id].label,
      priceCents: SHIPPING_METHODS[id].priceCents,
      estimate: label,
      estimateYear: year,
      available: true,
      reason: null,
      totalIfChosenCents: computeQuote({ lines: pricedLines, shippingMethod: id, discount }).totalCents,
    };
  });
}

export function checkoutView(db: Db, cart: Cart | undefined, viewer: SessionLookup, scenario: Scenario, at: Date): CheckoutView {
  const empty: Cart = { token: "", lines: [], saved: [], promoCode: null };
  const c = cart ?? empty;
  const changes = cart ? cartChanges(db, cart) : [];
  const draft = db.checkouts[c.token];
  return {
    cart: cartView(db, cart),
    quote: quoteFor(db, c, c.lines, at),
    changes,
    reconciledQuote: changes.length > 0 ? quoteFor(db, c, reconciledLines(db, c), at) : null,
    viewer: checkoutViewer(db, viewer),
    delivery: draft ? { email: draft.email, address: draft.address, emailUpdates: draft.emailUpdates } : null,
    coverage: coverageOf(db, c, scenario),
    shippingOptions: shippingOptions(db, c, scenario, at),
  };
}

// ------------------------------------------------------- O03 / O04 writes

function requireItems(cart: Cart | undefined): Cart {
  if (!cart || cart.lines.length === 0) throw new MockApiError("validation_failed", "Your cart is empty.");
  return cart;
}

function shippingUnavailable(): MockApiError {
  return new MockApiError("shipping_unavailable", SHIPPING_UNAVAILABLE);
}

function fieldErrorsOf(issues: { path: (string | number)[]; message: string }[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * O03: guest form and saved-address choice share this validation (E07).
 * The address is kept even when the region is unsupported (E14), so the
 * customer can edit it rather than retype it.
 */
export function saveDelivery(db: Db, cart: Cart | undefined, body: unknown, viewer: SessionLookup, scenario: Scenario): void {
  const c = requireItems(cart);
  const parsed = DeliveryInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Check the highlighted fields.", fieldErrorsOf(parsed.error.issues));
  }
  const { email, saveAddress, emailUpdates, ...address } = parsed.data;
  const previous = db.checkouts[c.token];
  db.checkouts[c.token] = { email, address, emailUpdates, shippingMethod: previous?.shippingMethod ?? "standard" };

  const customer = customerOf(db, viewer);
  if (customer && saveAddress) {
    const same = customer.addresses.some((a) => a.line1 === address.line1 && a.zip === address.zip && a.fullName === address.fullName);
    if (!same) customer.addresses.push({ ...address, id: nextId(db, "adr"), isDefault: customer.addresses.length === 0 });
  }
  if (scenario.shipping === "unsupported") throw shippingUnavailable();
}

/** O04: methods depend on the verified address and server rates. */
export function chooseShipping(db: Db, cart: Cart | undefined, method: ShippingMethodId, scenario: Scenario): void {
  const c = requireItems(cart);
  const draft = db.checkouts[c.token];
  if (!draft) throw new MockApiError("validation_failed", "Enter a delivery address first.");
  if (scenario.shipping === "unsupported") throw shippingUnavailable();
  draft.shippingMethod = method;
}

// --------------------------------------------------------------- payment

function paymentLabel(token: string): string {
  const [, brand = "card", last4 = ""] = token.split("_");
  const name = brand === "visa" ? "Visa" : brand === "mastercard" ? "Mastercard" : brand === "amex" ? "Amex" : "Card";
  return `${name} ending ${last4}`;
}

function intentView(intent: PaymentIntentRecord): PaymentIntentView {
  return { id: intent.id, status: intent.status, amountCents: intent.amountCents, orderId: intent.orderId };
}

/**
 * O05 "Pay": final server quote, then one intent per idempotency key. A
 * repeated key returns the existing intent, never a second charge.
 */
export function submitPayment(
  db: Db,
  cart: Cart | undefined,
  body: unknown,
  viewer: SessionLookup,
  scenario: Scenario,
  at: Date,
): PaymentIntentView {
  const parsed = PaymentInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new MockApiError("validation_failed", "Check the highlighted fields.", fieldErrorsOf(parsed.error.issues));
  }
  const input = parsed.data;
  const existing = db.paymentIntents.find((i) => i.idempotencyKey === input.idempotencyKey);
  if (existing) {
    if (existing.cartToken !== cart?.token) throw new MockApiError("not_found", "Payment not found.");
    return intentView(existing);
  }

  const c = requireItems(cart);
  const draft = db.checkouts[c.token];
  if (!draft) throw new MockApiError("validation_failed", "Enter a delivery address first.");
  if (scenario.shipping === "unsupported") throw shippingUnavailable();
  if (!input.billingSameAsDelivery) {
    const billing = AddressInputSchema.safeParse(input.billingAddress);
    if (!billing.success) {
      const errors = fieldErrorsOf(billing.error.issues.map((i) => ({ ...i, path: ["billing", ...i.path] })));
      throw new MockApiError("validation_failed", "Check the billing address.", errors);
    }
  }
  const changes = cartChanges(db, c);
  const quote = quoteFor(db, c, c.lines, at);
  if (changes.length > 0 || quote.totalCents !== input.expectedTotalCents) {
    throw new MockApiError("quote_changed", "Review changes before paying", undefined, { changes });
  }

  const customer = customerOf(db, viewer);
  const intent: PaymentIntentRecord = {
    id: nextId(db, "pi"),
    idempotencyKey: input.idempotencyKey,
    amountCents: quote.totalCents,
    status: "processing",
    orderId: null,
    createdAt: at.toISOString(),
    cartToken: c.token,
    customerId: customer?.id ?? null,
    outcome: scenario.payment,
    paymentMethodLabel: paymentLabel(input.paymentToken),
    snapshot: {
      lines: c.lines.map((l) => {
        const found = findVariant(db, l.sku);
        return {
          sku: l.sku,
          productName: found?.product.name ?? l.sku,
          variantLabel: found ? variantShortLabel(found.variant) : "",
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
        };
      }),
      quote,
      email: draft.email,
      address: draft.address,
    },
  };
  db.paymentIntents.push(intent);
  return intentView(intent);
}

function nextOrderId(db: Db): string {
  const max = db.orders.reduce((m, o) => Math.max(m, Number(o.id.slice(3))), 10000);
  return `BS-${String(max + 1)}`;
}

/**
 * Verified success only: create the order once, take the stock, clear the
 * purchased lines and checkout details, and grant this browser a short
 * order session for the guest confirmation (O08).
 */
function finalizePaid(db: Db, intent: PaymentIntentRecord, at: Date): void {
  intent.status = "paid";
  if (intent.orderId) return;
  const { lines, quote, email, address } = intent.snapshot;
  const { lines: _lines, ...totals } = quote;
  const order: Order = {
    id: nextOrderId(db),
    customerId: intent.customerId,
    email,
    lines,
    totals,
    shippingAddress: address,
    paymentStatus: "paid",
    fulfillmentStatus: "unfulfilled",
    paymentMethodLabel: intent.paymentMethodLabel,
    placedAt: at.toISOString(),
    deliveredAt: null,
    tracking: null,
    remainingBalanceCents: quote.totalCents,
    version: 1,
  };
  db.orders.push(order);
  intent.orderId = order.id;

  for (const line of lines) {
    const variant = findVariant(db, line.sku)?.variant;
    if (!variant) continue;
    const taken = Math.min(line.quantity, variant.stock.available);
    variant.stock.available -= taken;
    variant.stock.reserved += taken;
  }
  const discount = db.discounts.find((d) => d.code === quote.promoCode);
  if (discount) discount.usageCount += 1;

  const cart = db.carts.find((c) => c.token === intent.cartToken);
  if (cart) {
    const bought = new Set(lines.map((l) => l.sku));
    cart.lines = cart.lines.filter((l) => !bought.has(l.sku));
    cart.promoCode = null;
  }
  db.checkouts[intent.cartToken] = undefined;
  db.orderAccess.push({
    cartToken: intent.cartToken,
    orderId: order.id,
    expiresAt: addMinutes(at, ORDER_ACCESS_MINUTES).toISOString(),
  });
  sendEmail(
    db,
    {
      kind: "order-receipt",
      to: email,
      subject: `Order ${order.id} confirmed`,
      body: `Thank you — payment confirmed. ${order.id} · ${formatCents(quote.totalCents)} paid with ${intent.paymentMethodLabel}.`,
      link: `/orders/${order.id}/confirmation`,
      code: null,
    },
    at,
  );
}

function requireIntent(db: Db, id: string, cartToken: string | undefined): PaymentIntentRecord {
  const intent = db.paymentIntents.find((i) => i.id === id);
  // Another browser's intent reads exactly like a missing one.
  if (!intent || intent.cartToken !== cartToken) throw new MockApiError("not_found", "Payment not found.");
  return intent;
}

/**
 * O06 status read. The simulated provider settles on the first read:
 * paid and declined are known outcomes; the uncertain and pending
 * scenarios report `pending` (E15) until "Check status".
 */
export function readIntent(db: Db, id: string, cartToken: string | undefined, at: Date): PaymentIntentView {
  const intent = requireIntent(db, id, cartToken);
  if (intent.status === "processing") {
    if (intent.outcome === "paid") finalizePaid(db, intent, at);
    else if (intent.outcome === "declined") intent.status = "declined";
    else intent.status = "pending";
  }
  return intentView(intent);
}

/** E15 "Check status": look up the existing intent; never create a new one. */
export function checkIntent(db: Db, id: string, cartToken: string | undefined, at: Date): PaymentIntentView {
  const intent = requireIntent(db, id, cartToken);
  if (intent.status === "processing") return readIntent(db, id, cartToken, at);
  if (intent.status === "pending") {
    if (intent.outcome === "uncertain-paid") finalizePaid(db, intent, at);
    else if (intent.outcome === "uncertain-failed") intent.status = "declined";
  }
  return intentView(intent);
}

// ------------------------------------------------------------------ O08

/**
 * Owner session or this browser's short-lived order session. Anyone else
 * gets the same not_found as a missing order (spec §5.4).
 */
export function orderConfirmation(
  db: Db,
  id: string,
  viewer: SessionLookup,
  cartToken: string | undefined,
  at: Date,
): OrderConfirmation {
  const order = db.orders.find((o) => o.id === id);
  const ownerId = viewer.status === "active" && viewer.session.kind === "customer" ? viewer.session.userId : null;
  const owns = !!order && order.customerId !== null && order.customerId === ownerId;
  const granted =
    !!order &&
    !!cartToken &&
    db.orderAccess.some((g) => g.orderId === id && g.cartToken === cartToken && new Date(g.expiresAt) > at);
  if (!order || order.paymentStatus === "pending_payment" || (!owns && !granted)) {
    throw new MockApiError("not_found", "We couldn’t find that order.");
  }
  const method = order.totals.shippingMethod ?? "standard";
  const { label, year } = shippingEstimate(method, new Date(order.placedAt));
  const { version: _version, ...rest } = order;
  return {
    order: {
      ...rest,
      lines: order.lines.map((l) => {
        const found = findVariant(db, l.sku);
        return found ? { ...l, variantLabel: variantShortLabel(found.variant) } : l;
      }),
    },
    shippingLabel: SHIPPING_METHODS[method].label,
    estimate: label,
    estimateYear: year,
    isGuest: order.customerId === null,
  };
}
