// DELETE-ME-LATER: reads scenario flags from the request and consumes
// one-shot flags (spec §7.1).
import {
  DEFAULT_SCENARIO,
  SCENARIO_COOKIE,
  SCENARIO_DEFS,
  SCENARIO_KEYS,
  oneShotId,
  parseScenarioState,
  serializeScenario,
  type OneShotTokens,
  type Scenario,
  type ScenarioKey,
} from "@/lib/dev/scenario-defs";
import type { Db } from "./types";

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };

/**
 * Current flags for this request, with one-shot flags already consumed (by
 * any earlier request, browser or server-side) reset to their defaults.
 */
export function readScenario(request: CookieReader, db: Db): { scenario: Scenario; tokens: OneShotTokens } {
  const { scenario, tokens } = parseScenarioState(request.cookies.get(SCENARIO_COOKIE)?.value);
  const effective: Record<string, string> = { ...scenario };
  for (const key of SCENARIO_KEYS) {
    if (!SCENARIO_DEFS[key].oneShot || scenario[key] === DEFAULT_SCENARIO[key]) continue;
    if (db.consumedOneShots.includes(oneShotId(key, scenario[key], tokens[key] ?? ""))) {
      effective[key] = DEFAULT_SCENARIO[key];
    }
  }
  return { scenario: effective as Scenario, tokens };
}

/**
 * Tracks which one-shot flags a handler used. Consumption is recorded in the
 * store (authoritative) and the response also clears it from the cookie when
 * the browser made the request directly, so the toolbar stays tidy.
 */
export class ScenarioContext {
  readonly scenario: Scenario;
  private readonly tokens: OneShotTokens;
  private readonly db: Db;
  private readonly consumed = new Set<ScenarioKey>();

  constructor(db: Db, state: { scenario: Scenario; tokens: OneShotTokens }) {
    this.db = db;
    this.scenario = state.scenario;
    this.tokens = state.tokens;
  }

  consume(key: ScenarioKey): void {
    if (!SCENARIO_DEFS[key].oneShot || this.scenario[key] === DEFAULT_SCENARIO[key]) return;
    this.consumed.add(key);
    this.db.consumedOneShots.push(oneShotId(key, this.scenario[key], this.tokens[key] ?? ""));
  }

  /** Cookie value after consumption, or null when nothing changed. */
  nextCookieValue(): string | null {
    if (this.consumed.size === 0) return null;
    const next = { ...this.scenario } as Record<ScenarioKey, string>;
    for (const key of this.consumed) next[key] = DEFAULT_SCENARIO[key];
    return serializeScenario(next as Scenario, this.tokens);
  }
}
