/**
 * Scenario flags for the mock server (spec §7.1). Shared by the DevToolbar
 * (to render controls) and the mock server (to read them), so it lives in
 * lib/ rather than mock-server/.
 *
 * Cookie / URL format: comma-separated `key:value` pairs, defaults omitted,
 * e.g. `payment:declined,latency:800`. `?scenario=clear` resets everything.
 */

export const SCENARIO_COOKIE = "__scenario";

export const SCENARIO_DEFS = {
  payment: {
    label: "Payment outcome",
    options: ["paid", "declined", "uncertain-paid", "uncertain-failed", "pending"],
    oneShot: false,
  },
  quote: {
    label: "Quote drift",
    options: ["none", "stock", "price", "both"],
    oneShot: false,
  },
  shipping: {
    label: "Shipping",
    options: ["supported", "unsupported"],
    oneShot: false,
  },
  promo: {
    label: "Promo",
    options: ["normal", "expired", "invalid", "ineligible"],
    oneShot: false,
  },
  latency: {
    label: "Latency (ms)",
    options: ["0", "800", "4000"],
    oneShot: false,
  },
  network: {
    label: "Network",
    options: ["ok", "fail-read", "fail-write"],
    oneShot: true,
  },
  tokens: {
    label: "Auth tokens",
    options: ["normal", "verification-expired", "reset-expired"],
    oneShot: false,
  },
  guestCode: {
    label: "Guest code",
    options: ["normal", "invalid"],
    oneShot: false,
  },
  order: {
    label: "Order BS-10428 snapshot",
    options: ["processing", "shipped", "delivered"],
    oneShot: false,
  },
  rma: {
    label: "RMA status",
    options: ["received", "approved", "denied", "refunded"],
    oneShot: false,
  },
  conflict: {
    label: "Concurrency",
    options: ["none", "inventory", "discount", "content"],
    oneShot: true,
  },
  clock: {
    label: "Clock",
    options: ["frozen", "real"],
    oneShot: false,
  },
} as const;

export type ScenarioKey = keyof typeof SCENARIO_DEFS;
export type ScenarioValue<K extends ScenarioKey> = (typeof SCENARIO_DEFS)[K]["options"][number];
export type Scenario = { [K in ScenarioKey]: ScenarioValue<K> };

export const SCENARIO_KEYS = Object.keys(SCENARIO_DEFS) as ScenarioKey[];

/** The first option of each flag is its default. */
export const DEFAULT_SCENARIO = Object.fromEntries(
  SCENARIO_KEYS.map((key) => [key, SCENARIO_DEFS[key].options[0]]),
) as Scenario;

function isScenarioKey(key: string): key is ScenarioKey {
  return Object.hasOwn(SCENARIO_DEFS, key);
}

function isOption(key: ScenarioKey, value: string): boolean {
  return (SCENARIO_DEFS[key].options as readonly string[]).includes(value);
}

/**
 * Parses `key:value,...`. Unknown keys and invalid values are ignored so a
 * stale cookie can never break a page.
 */
export function parseScenario(raw: string | null | undefined, base = DEFAULT_SCENARIO): Scenario {
  const result: Record<string, string> = { ...base };
  if (!raw) return result as Scenario;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return result as Scenario;
  }
  for (const pair of decoded.split(",")) {
    const [key = "", value = ""] = pair.split(":").map((s) => s.trim());
    if (isScenarioKey(key) && isOption(key, value)) result[key] = value;
  }
  return result as Scenario;
}

/** Serializes only the flags that differ from the defaults. */
export function serializeScenario(scenario: Scenario): string {
  return SCENARIO_KEYS.filter((key) => scenario[key] !== DEFAULT_SCENARIO[key])
    .map((key) => `${key}:${scenario[key]}`)
    .join(",");
}

/** Applies a `?scenario=` value on top of the current cookie value. */
export function mergeScenarioParam(cookieValue: string | undefined, param: string): string {
  if (param === "clear") return "";
  return serializeScenario(parseScenario(param, parseScenario(cookieValue)));
}

export function activeFlags(scenario: Scenario): ScenarioKey[] {
  return SCENARIO_KEYS.filter((key) => scenario[key] !== DEFAULT_SCENARIO[key]);
}

export const IDENTITY_OPTIONS = [
  { value: "signed-out", label: "Signed out" },
  { value: "customer", label: "Customer: Jordan Lee" },
  { value: "unverified", label: "Unverified user: Robin Kim" },
  { value: "staff:catalog_editor", label: "Staff: catalog editor" },
  { value: "staff:fulfillment", label: "Staff: fulfillment" },
  { value: "staff:content_editor", label: "Staff: content editor" },
  { value: "staff:support", label: "Staff: support" },
  { value: "staff:admin", label: "Staff: admin (Alex)" },
] as const;
export type IdentityOption = (typeof IDENTITY_OPTIONS)[number]["value"];

export function isIdentityOption(value: string): value is IdentityOption {
  return IDENTITY_OPTIONS.some((o) => o.value === value);
}
