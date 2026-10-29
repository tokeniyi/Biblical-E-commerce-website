import { NextResponse } from "next/server";
import { DEFAULT_SCENARIO, type Scenario } from "@/lib/dev/scenario-defs";
import { now } from "@/mock-server/clock";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE } from "@/mock-server/services/auth";
import { loadSampleCart, setCartCookie } from "@/mock-server/services/cart";
import { readIntent, saveDelivery, submitPayment } from "@/mock-server/services/checkout";
import { getDb } from "@/mock-server/store";
import type { Db } from "@/mock-server/types";
import type { Cart } from "@your-app/shared";

const SAMPLE_DELIVERY = {
  fullName: "Jordan Lee",
  email: "jordan@example.com",
  line1: "24 Oak Street",
  city: "Portland",
  state: "OR",
  zip: "97205",
  country: "US",
};

type Stage = "cart" | "delivery" | "processing" | "failed" | "confirmed";
const STAGES: readonly Stage[] = ["cart", "delivery", "processing", "failed", "confirmed"];

/**
 * Advances the sample cart through checkout with the drawn guest details,
 * so O04–O08 open in a real state. Returns where to land, or null to use `next`.
 */
function advance(db: Db, cart: Cart, stage: Stage, scenario: Scenario): string | null {
  if (stage === "cart") return null;
  const at = now(scenario);
  const guest = { status: "none" } as const;
  saveDelivery(db, cart, SAMPLE_DELIVERY, guest, { ...DEFAULT_SCENARIO, clock: scenario.clock });
  if (stage === "delivery") return null;
  const payment = stage === "processing" ? "pending" : stage === "failed" ? "declined" : "paid";
  const intent = submitPayment(
    db,
    cart,
    {
      idempotencyKey: crypto.randomUUID(),
      paymentToken: "sim_visa_4242",
      billingSameAsDelivery: true,
      billingAddress: null,
      termsAccepted: true,
      expectedTotalCents: 7304,
    },
    guest,
    { ...DEFAULT_SCENARIO, payment, clock: scenario.clock },
    at,
  );
  if (stage === "processing") return `/checkout/processing?intent=${intent.id}`;
  const settled = readIntent(db, intent.id, cart.token, at);
  return stage === "failed"
    ? `/checkout/payment?status=failed&intent=${intent.id}`
    : `/orders/${settled.orderId ?? ""}/confirmation`;
}

/**
 * Loads the cart drawn in C07/C08 for this browser. `?next=/cart/saved`
 * answers with a redirect, so a plain HTML form on /__dev/screens can use it.
 * `?stage=` also walks it into checkout (delivery, processing, failed, confirmed).
 */
export const POST = mockHandler(
  (request, { scenario }) => {
    const db = getDb();
    const cart = loadSampleCart(db, request.cookies.get(CART_COOKIE)?.value);
    const rawStage = request.nextUrl.searchParams.get("stage") ?? "cart";
    const stage = STAGES.find((s) => s === rawStage) ?? "cart";
    const landing = advance(db, cart, stage, scenario);
    const next = landing ?? request.nextUrl.searchParams.get("next");
    // Same-origin relative paths only ("//host" and "/\host" leave the site).
    const response =
      next && /^\/(?![/\\])/.test(next)
        ? NextResponse.redirect(new URL(next, request.nextUrl.origin), 303)
        : NextResponse.json({ ok: true });
    setCartCookie(response, cart.token);
    return response;
  },
  { dev: true },
);
