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
    // Changes the catalog once (like a real sale or repricing); E06 then
    // stays until the customer accepts, so re-applying would loop.
    oneShot: true,
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
 * One-shot flags carry a token (`network:fail-read~k3j9x2ab`). The mock
 * server records consumed tokens in its store, so a flag fires exactly once
 * even when the consuming request is a server-side fetch whose Set-Cookie
 * never reaches the browser. Setting the flag again issues a new token.
 */
export type OneShotTokens = Partial<Record<ScenarioKey, string>>;
export type ScenarioState = { scenario: Scenario; tokens: OneShotTokens };

type Pair = { key: ScenarioKey; value: string; token: string };

function parsePairs(raw: string | null | undefined): Pair[] {
  if (!raw) return [];
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return [];
  }
  const pairs: Pair[] = [];
  for (const part of decoded.split(",")) {
    const [key = "", rest = ""] = part.split(":").map((s) => s.trim());
    const [value = "", token = ""] = rest.split("~");
    if (isScenarioKey(key) && isOption(key, value)) pairs.push({ key, value, token });
  }
  return pairs;
}

/**
 * Parses `key:value[~token],...`. Unknown keys and invalid values are ignored
 * so a stale cookie can never break a page.
 */
export function parseScenarioState(raw: string | null | undefined): ScenarioState {
  const scenario: Record<string, string> = { ...DEFAULT_SCENARIO };
  const tokens: OneShotTokens = {};
  for (const { key, value, token } of parsePairs(raw)) {
    scenario[key] = value;
    if (SCENARIO_DEFS[key].oneShot) tokens[key] = token;
  }
  return { scenario: scenario as Scenario, tokens };
}

export function parseScenario(raw: string | null | undefined): Scenario {
  return parseScenarioState(raw).scenario;
}

export function randomToken(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Serializes only the flags that differ from the defaults. One-shot flags
 * without a token get a fresh one.
 */
export function serializeScenario(
  scenario: Scenario,
  tokens: OneShotTokens = {},
  newToken: () => string = randomToken,
): string {
  return SCENARIO_KEYS.filter((key) => scenario[key] !== DEFAULT_SCENARIO[key])
    .map((key) => {
      if (!SCENARIO_DEFS[key].oneShot) return `${key}:${scenario[key]}`;
      return `${key}:${scenario[key]}~${tokens[key] || newToken()}`;
    })
    .join(",");
}

/**
 * Layers explicitly listed flags over the current cookie value. Re-listed
 * one-shot flags get a new token, so they fire again.
 */
export function mergeScenario(
  cookieValue: string | undefined,
  patch: Partial<Record<ScenarioKey, string>>,
  newToken: () => string = randomToken,
): string {
  const { scenario, tokens } = parseScenarioState(cookieValue);
  const next: Record<string, string> = { ...scenario };
  for (const key of SCENARIO_KEYS) {
    const value = patch[key];
    if (value === undefined || !isOption(key, value)) continue;
    next[key] = value;
    tokens[key] = "";
  }
  return serializeScenario(next as Scenario, tokens, newToken);
}

/** Applies a `?scenario=` value on top of the current cookie value. */
export function mergeScenarioParam(
  cookieValue: string | undefined,
  param: string,
  newToken: () => string = randomToken,
): string {
  if (param === "clear") return "";
  const patch = Object.fromEntries(parsePairs(param).map((p) => [p.key, p.value]));
  return mergeScenario(cookieValue, patch, newToken);
}

/** Store key for a consumed one-shot flag. */
export function oneShotId(key: ScenarioKey, value: string, token: string): string {
  return `${key}:${value}~${token}`;
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
