/**
 * Keeps analytics free of personal data: only allow-listed query params
 * survive, values are truncated, and labels never include form input.
 */

/** Listing facets, sort/pagination and the search term: none identify a person. */
export const ALLOWED_QUERY_KEYS = [
  "q",
  "translation",
  "type",
  "language",
  "binding",
  "price",
  "availability",
  "largePrint",
  "sort",
  "page",
  "rating",
  "variant",
  "cart",
  "status",
] as const;

const ALLOWED = new Set<string>(ALLOWED_QUERY_KEYS);
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

export function truncate(value: string, max = 80): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Removes anything that looks like an email address. */
export function scrubText(value: string, max = 80): string {
  return truncate(value.replace(EMAIL, "[email]"), max);
}

/** "/search?q=esv&returnTo=/x&email=a@b.c" -> "/search?q=esv". */
export function sanitizePath(input: string): string {
  let url: URL;
  try {
    url = new URL(input, "http://local.invalid");
  } catch {
    return "/";
  }
  const kept = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (ALLOWED.has(key)) kept.set(key, scrubText(value, 60));
  }
  const query = kept.toString();
  const path = url.pathname.slice(0, 200) || "/";
  return query ? `${path}?${query}` : path;
}

/**
 * Groups concrete URLs into pages for reporting: product, order and RMA ids
 * collapse into placeholders; category slugs stay because they are useful.
 */
export function pageGroup(path: string): string {
  const pathname = path.split("?")[0] ?? "/";
  return pathname
    .replace(/^\/products\/[^/]+/, "/products/[slug]")
    .replace(/^\/orders\/[^/]+/, "/orders/[id]")
    .replace(/^\/account\/orders\/[^/]+/, "/account/orders/[id]")
    .replace(/\/returns\/(?!new)[^/]+/, "/returns/[rma]")
    .replace(/\/items\/[^/]+/, "/items/[sku]");
}
