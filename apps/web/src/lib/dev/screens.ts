/**
 * Inventory of every wireframed screen and edge state (spec §3), with its
 * Figma node and a live route preset. Drives /__dev/screens, /__dev/states
 * and the "not built yet" stubs, and doubles as the coverage checklist.
 */

export const FIGMA_FILE_URL = "https://www.figma.com/design/SUDhoGrpRkuNLovJZhEOfP/Untitled";

export function figmaNodeUrl(node: string): string {
  return `${FIGMA_FILE_URL}?node-id=${node.replace(":", "-")}`;
}

import type { IdentityOption } from "./scenario-defs";

/**
 * Who to be (and what to prepare) before opening a screen: POST
 * /api/__dev/as, which then redirects to the screen's href.
 */
export type Preset = { identity?: IdentityOption; prep?: "expire" | "reset-link" };

export function presetAction(href: string, preset: Preset): string {
  const params = new URLSearchParams({ next: href });
  if (preset.identity) params.set("identity", preset.identity);
  if (preset.prep) params.set("prep", preset.prep);
  return `/api/__dev/as?${params.toString()}`;
}

export type ScreenGroup = "Customer" | "Checkout & orders" | "Account" | "Admin";

export type Screen = {
  id: string;
  name: string;
  node: string;
  group: ScreenGroup;
  /** Route pattern from the spec. */
  route: string;
  /** Concrete URL to open, with fixture ids and any scenario preset. */
  href: string;
  phase: number;
  /**
   * Open it with the drawn sample cart loaded (POST /api/__dev/cart/sample);
   * a stage also walks it into checkout with the drawn guest details.
   */
  sampleCart?: true | "delivery" | "processing" | "failed" | "confirmed";
  preset?: Preset;
};

const s = (
  id: string,
  name: string,
  node: string,
  group: ScreenGroup,
  route: string,
  href: string,
  phase: number,
): Screen => ({ id, name, node, group, route, href, phase });

export const SCREENS: readonly Screen[] = [
  s("C01", "Home", "16:428", "Customer", "/", "/", 1),
  s("C02", "Category directory", "16:500", "Customer", "/categories", "/categories", 1),
  s("C03", "Browse Bibles", "16:545", "Customer", "/categories/[slug]", "/categories/bibles", 1),
  s("C04", "Search results", "16:611", "Customer", "/search?q=…", "/search?q=bible", 1),
  s("C05", "Product & variant", "16:678", "Customer", "/products/[slug]?variant=SKU", "/products/esv-study-bible?variant=ESV-ST-HC", 1),
  s("C06", "Product reviews", "16:738", "Customer", "/products/[slug]/reviews", "/products/esv-study-bible/reviews", 1),
  { ...s("C07", "Added to cart", "16:789", "Customer", "/products/[slug]?cart=added", "/products/esv-study-bible?variant=ESV-ST-HC&cart=added", 1), sampleCart: true },
  { ...s("C08", "Saved for later", "16:831", "Customer", "/cart/saved", "/cart/saved", 1), sampleCart: true },

  { ...s("O01", "Your cart", "16:873", "Checkout & orders", "/cart", "/cart", 2), sampleCart: true },
  { ...s("O02", "Checkout identity", "16:923", "Checkout & orders", "/checkout/identity", "/checkout/identity", 2), sampleCart: true },
  { ...s("O03", "Contact & delivery", "16:965", "Checkout & orders", "/checkout/delivery", "/checkout/delivery", 2), sampleCart: true },
  { ...s("O04", "Delivery method", "16:1026", "Checkout & orders", "/checkout/shipping", "/checkout/shipping", 2), sampleCart: "delivery" },
  { ...s("O05", "Payment & review", "16:1069", "Checkout & orders", "/checkout/payment", "/checkout/payment", 2), sampleCart: "delivery" },
  { ...s("O06", "Processing", "16:1125", "Checkout & orders", "/checkout/processing?intent=…", "/checkout/processing", 2), sampleCart: "processing" },
  { ...s("O07", "Payment failed", "16:1163", "Checkout & orders", "/checkout/payment?status=failed", "/checkout/payment?status=failed", 2), sampleCart: "failed" },
  { ...s("O08", "Order confirmed", "16:1202", "Checkout & orders", "/orders/[id]/confirmation", "/orders/BS-10429/confirmation", 2), sampleCart: "confirmed" },
  s("O09", "Find guest order", "16:1248", "Checkout & orders", "/orders/lookup → /orders/verify", "/orders/lookup", 4),
  s("O10", "Track order", "16:1289", "Checkout & orders", "/orders/[id]/tracking", "/orders/BS-10428/tracking?scenario=order:shipped", 4),
  s("O11", "Cancel order", "16:1330", "Checkout & orders", "/orders/[id]/cancel", "/orders/BS-10428/cancel", 4),
  s("O12", "Request return", "16:1374", "Checkout & orders", "/orders/[id]/returns/new", "/orders/BS-10428/returns/new?scenario=order:delivered", 4),
  s("O13", "Return status", "16:1417", "Checkout & orders", "/orders/[id]/returns/[rma]", "/orders/BS-10428/returns/RMA-204?scenario=order:delivered,rma:refunded", 4),

  { ...s("A01", "Sign in", "16:1470", "Account", "/login?returnTo=", "/login", 3), preset: { identity: "signed-out" } },
  { ...s("A02", "Create account", "16:1508", "Account", "/register?returnTo=", "/register", 3), preset: { identity: "signed-out" } },
  { ...s("A03", "Verify email", "16:1553", "Account", "/verify-email?token=", "/verify-email", 3), preset: { identity: "unverified" } },
  { ...s("A04", "Forgot password", "16:1595", "Account", "/password/forgot", "/password/forgot", 3), preset: { identity: "signed-out" } },
  s("A05", "Check your email", "16:1628", "Account", "/password/sent", "/password/sent", 3),
  { ...s("A06", "Set new password", "16:1661", "Account", "/password/reset?token=", "/password/reset", 3), preset: { identity: "signed-out", prep: "reset-link" } },
  { ...s("A07", "Account overview", "16:1699", "Account", "/account", "/account", 3), preset: { identity: "customer" } },
  { ...s("A08", "Profile", "16:1744", "Account", "/account/profile", "/account/profile", 3), preset: { identity: "customer" } },
  { ...s("A09", "Addresses", "16:1795", "Account", "/account/addresses", "/account/addresses", 3), preset: { identity: "customer" } },
  { ...s("A10", "Orders", "16:1858", "Account", "/account/orders", "/account/orders", 3), preset: { identity: "customer" } },
  { ...s("A11", "Order details", "16:1895", "Account", "/account/orders/[id]", "/account/orders/BS-10428", 3), preset: { identity: "customer" } },
  { ...s("A12", "Wishlist", "16:1940", "Account", "/account/wishlist", "/account/wishlist", 3), preset: { identity: "customer" } },
  { ...s("A13", "My reviews", "16:1991", "Account", "/account/reviews", "/account/reviews", 3), preset: { identity: "customer" } },
  s("A14", "Sign in required", "16:2038", "Account", "/login?reason=session-expired&returnTo=", "/login?reason=session-expired&returnTo=%2Faccount%2Forders%2FBS-10428", 3),

  s("B01", "Staff sign in", "16:2080", "Admin", "/admin/login?returnTo=", "/admin/login", 5),
  s("B02", "Overview", "16:2118", "Admin", "/admin", "/admin", 5),
  s("B03", "Products", "16:2177", "Admin", "/admin/products", "/admin/products", 5),
  s("B04", "Create/edit product", "16:2226", "Admin", "/admin/products/new, /admin/products/[slug]/edit", "/admin/products/esv-study-bible/edit", 5),
  s("B05", "Inventory", "16:2285", "Admin", "/admin/inventory", "/admin/inventory", 5),
  s("B06", "Orders", "16:2341", "Admin", "/admin/orders", "/admin/orders", 5),
  s("B07", "Order detail", "16:2388", "Admin", "/admin/orders/[id]", "/admin/orders/BS-10428", 5),
  s("B08", "Customers", "16:2445", "Admin", "/admin/customers", "/admin/customers", 5),
  s("B09", "Customer detail", "16:2485", "Admin", "/admin/customers/[id]", "/admin/customers/cus_jordan", 5),
  s("B10", "Discounts", "16:2528", "Admin", "/admin/discounts", "/admin/discounts", 5),
  s("B11", "Create/edit discount", "16:2572", "Admin", "/admin/discounts/new, /admin/discounts/[code]/edit", "/admin/discounts/READ10/edit", 5),
  s("B12", "Site content", "16:2629", "Admin", "/admin/content", "/admin/content", 5),
  s("B13", "Edit content page", "16:2672", "Admin", "/admin/content/[slug]/edit", "/admin/content/shipping-returns/edit", 5),
];

export type EdgeState = {
  id: string;
  name: string;
  node: string;
  host: string;
  trigger: string;
  recovery: string;
  phase: number;
  /** Where the state appears in the real flow, with its scenario preset. Null until its phase. */
  href: string | null;
  preset?: Preset;
};

const e = (
  id: string,
  name: string,
  node: string,
  host: string,
  trigger: string,
  recovery: string,
  phase: number,
  href: string | null = null,
): EdgeState => ({ id, name, node, host, trigger, recovery, phase, href });

export const EDGE_STATES: readonly EdgeState[] = [
  e("E01", "Empty cart", "16:2731", "O01", "Last item removed / first visit", "C03, C08", 2, "/cart"),
  e("E02", "No search results", "16:2745", "C04/C03", "Zero matches", "Clear filters, edit search, C02", 1, "/search?q=spanish+study&translation=ESV&binding=Hardcover"),
  { ...e("E03", "Empty wishlist", "16:2759", "A12", "Nothing saved", "C03, A07", 3, "/account/wishlist"), preset: { identity: "unverified" } },
  { ...e("E04", "No orders yet", "16:2771", "A10", "No linked orders", "C01, O09", 3, "/account/orders"), preset: { identity: "unverified" } },
  e("E05", "Product sold out", "16:2784", "C05", "stock = 0", "C03 alternatives; wishlist A12/A01", 1, "/products/nlt-childrens-bible"),
  e("E06", "Cart stock/price changed", "16:2798", "O01→O05", "Server quote differs", "Accept & update → O01; remove item", 2, "/cart?scenario=quote:both"),
  e("E07", "Invalid address", "16:2817", "O03/A09", "Required/ZIP invalid", "Error summary, focus first invalid", 2, "/checkout/delivery"),
  e("E08", "Promo invalid/expired", "16:2834", "O01", "Bad/expired/ineligible code", "Keep code, totals unchanged", 2, "/cart?scenario=promo:expired"),
  { ...e("E09", "Login error", "16:2850", "A01", "Bad credentials", "Generic copy, retain email", 3, "/login"), preset: { identity: "signed-out" } },
  e("E10", "Reset token expired", "16:2864", "A06", "Expired/used token", "A04, A01", 3, "/password/reset?token=expired"),
  { ...e("E11", "Session expired", "16:2876", "A14", "Expired on guarded mutation", "A01 → returnTo (A11)", 3, "/account/orders/BS-10428"), preset: { identity: "customer", prep: "expire" } },
  e("E12", "Variant unavailable", "16:2889", "C05", "Draft/unavailable combo", "Offer valid variant", 1, "/products/esv-study-bible?variant=ESV-ST-LL-LP"),
  e("E13", "Guest verification invalid", "16:2903", "O09", "Wrong/expired code", "Resend, change lookup details", 4),
  e("E14", "Shipping unavailable", "16:2917", "O03/O04", "Unsupported region", "Edit address, back to cart", 2, "/checkout/delivery?scenario=shipping:unsupported"),
  e("E15", "Payment declined/uncertain", "16:2931", "O06/O07", "Known decline or unknown status", "Change method O05 / check status", 2, "/checkout/payment?scenario=payment:uncertain-paid"),
  e("E16", "Loading product grid", "16:2949", "C03/C04", "Fetching", "Keep filters, reserve card geometry", 1, "/categories/bibles?scenario=latency:4000"),
  e("E17", "Loading order details", "16:2972", "A11/O10", "Authorized fetch in progress", "Not a status confirmation", 4),
  e("E18", "Network error", "16:2994", "C04/A11", "Fetch failed", "Retry original route", 1, "/search?q=bible&scenario=network:fail-read"),
  e("E19", "404", "16:3006", "any", "Unknown slug/route", "C04, C02, C01", 1, "/products/missing"),
  e("E20", "403 admin forbidden", "16:3018", "/admin", "Customer or insufficient role", "B01, C01", 5),
  e("E21", "Cancellation ineligible", "16:3032", "O11", "Shipped before confirm", "O10, O12", 4),
  e("E22", "Refund denied", "16:3044", "O13", "Condition not met", "Retain reason; help link", 4),
  e("E23", "Saved/published success", "16:3057", "A08/B13", "Mutation success", "Announce, no forced navigation", 5),
  e("E24", "Discount validation conflict", "16:3068", "B11", "Duplicate code, %>100, dates", "Keep fields, summary links", 5),
  e("E25", "Inventory edit conflict", "16:3087", "B05", "Version changed (12→11)", "Reload & review; reason retained", 5),
];

export function screensById(ids: readonly string[]): Screen[] {
  return ids.flatMap((id) => SCREENS.filter((screen) => screen.id === id));
}
