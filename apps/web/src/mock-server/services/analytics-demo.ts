// Demo traffic so /admin/insights is meaningful on a fresh store. Every
// record is flagged `demo: true` and the dashboard can exclude it.
import type { AnalyticsEventType, AnalyticsProps, DeviceClass } from "@your-app/shared";
import type { AnalyticsRecord } from "../types";

/** Small deterministic PRNG (mulberry32), so demo data is stable between reseeds. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS = ["esv-study-bible", "niv-everyday-bible", "kjv-large-print-bible", "nlt-childrens-bible", "esv-thinline-bible-01"];
const CATEGORIES = ["study", "devotional", "children", "large-print", "gift-editions"];
const SEARCHES: [string, number][] = [
  ["esv study", 4],
  ["large print", 6],
  ["kjv", 9],
  ["children", 3],
  ["nkjv", 0],
  ["csb study bible", 0],
  ["amplified", 0],
  ["journaling", 5],
];

export const DEMO_SESSIONS = 420;
const DAY_MS = 86_400_000;

export function generateDemoTraffic(now: number, sessions = DEMO_SESSIONS, seed = 20261122): AnalyticsRecord[] {
  const rand = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const records: AnalyticsRecord[] = [];
  let n = 0;
  const visitors = Array.from({ length: Math.round(sessions * 0.72) }, (_, i) => `demo-visitor-${String(i).padStart(4, "0")}`);

  for (let s = 0; s < sessions; s += 1) {
    const sessionId = `demo-session-${String(s).padStart(4, "0")}`;
    const visitorId = pick(visitors);
    const r = rand();
    const device: DeviceClass = r < 0.55 ? "desktop" : r < 0.93 ? "mobile" : "tablet";
    const mobile = device === "mobile";
    // Spread across the last 14 days, a little busier recently.
    let at = now - Math.floor(Math.pow(rand(), 0.8) * 14 * DAY_MS) - 3_600_000;

    const push = (type: AnalyticsEventType, path: string, props: AnalyticsProps = {}) => {
      n += 1;
      records.push({ id: `demo_${String(n)}`, visitorId, sessionId, device, type, path, at, props, demo: true });
    };
    const view = (path: string, opts: { minScroll?: number; maxScroll?: number } = {}) => {
      push("page_view", path, { title: path });
      const dwell = 6_000 + Math.floor(rand() * 70_000);
      at += dwell;
      const lo = opts.minScroll ?? 20;
      const hi = opts.maxScroll ?? 100;
      push("page_leave", path, { dwellMs: dwell, scroll: Math.round(lo + rand() * (hi - lo)) });
      at += 400;
    };
    const click = (path: string, target: string) => {
      push("click", path, { target });
    };

    // Entry page.
    const entry = rand();
    const product = pick(PRODUCTS);
    const category = pick(CATEGORIES);
    if (entry < 0.5) {
      view("/", { minScroll: 15, maxScroll: 70 });
      if (rand() < 0.36) continue; // bounce
      if (rand() < 0.25) {
        const [q, results] = pick(SEARCHES);
        click("/", "Header search");
        view(`/search?q=${encodeURIComponent(q)}`);
        push("search", `/search?q=${encodeURIComponent(q)}`, { q, results });
        if (results === 0) continue;
      } else {
        click("/", `Category tile: ${category}`);
        view(`/categories/${category}`);
      }
    } else if (entry < 0.7) {
      view(`/categories/${category}`);
      if (rand() < 0.3) continue;
    } else if (entry < 0.9) {
      // Lands on a product from an ad or search engine.
    } else {
      const [q, results] = pick(SEARCHES);
      view(`/search?q=${encodeURIComponent(q)}`);
      push("search", `/search?q=${encodeURIComponent(q)}`, { q, results });
      if (results === 0 || rand() < 0.4) continue;
    }

    // Product page (landing visitors always see it; others sometimes leave first).
    if (entry < 0.7 || entry >= 0.9) {
      if (rand() < 0.12) continue;
    }
    view(`/products/${product}`, { minScroll: 30, maxScroll: 95 });
    if (rand() < 0.3) push("dead_click", `/products/${product}`, { target: "Product image" });
    if (rand() < 0.35) {
      click(`/products/${product}`, "Read all reviews");
      view(`/products/${product}/reviews`);
    }
    if (rand() < 0.55) continue; // no add to cart
    click(`/products/${product}`, "Add to cart");
    push("add_to_cart", `/products/${product}`, { sku: product, quantity: 1 });

    // Cart.
    view("/cart");
    if (rand() < 0.28) continue;
    click("/cart", "Checkout");

    // Checkout steps.
    view("/checkout/identity");
    push("checkout_step", "/checkout/identity", { step: "identity" });
    click("/checkout/identity", "Continue as guest");
    if (rand() < 0.12) continue;
    view("/checkout/delivery");
    push("checkout_step", "/checkout/delivery", { step: "delivery" });
    if (rand() < (mobile ? 0.3 : 0.12)) continue;
    view("/checkout/shipping");
    push("checkout_step", "/checkout/shipping", { step: "shipping" });
    if (mobile && rand() < 0.35) {
      for (let k = 0; k < 3; k += 1) push("rage_click", "/checkout/shipping", { target: "Continue to payment" });
    }
    if (rand() < (mobile ? 0.22 : 0.08)) continue;
    view("/checkout/payment");
    push("checkout_step", "/checkout/payment", { step: "payment" });
    if (rand() < 0.15) {
      push("js_error", "/checkout/payment", { message: "Card field failed to load" });
    }
    if (rand() < (mobile ? 0.25 : 0.12)) continue;
    click("/checkout/payment", "Place order");
    view("/checkout/processing");
    const orderPath = "/orders/BS-DEMO/confirmation";
    view(orderPath);
    push("purchase", orderPath, { totalCents: 3900 + Math.floor(rand() * 6000) });
  }
  return records;
}
