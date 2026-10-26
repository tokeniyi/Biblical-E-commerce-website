// DELETE-ME-LATER: reads scenario flags from the request and consumes
// one-shot flags (spec §7.1).
import {
  DEFAULT_SCENARIO,
  SCENARIO_COOKIE,
  SCENARIO_DEFS,
  SCENARIO_KEYS,
  parseScenario,
  serializeScenario,
  type Scenario,
  type ScenarioKey,
} from "@/lib/dev/scenario-defs";

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };

export function readScenario(request: CookieReader): Scenario {
  return parseScenario(request.cookies.get(SCENARIO_COOKIE)?.value);
}

/**
 * Tracks which one-shot flags a handler used, so the response can clear them
 * from the cookie ("fail next write" fires exactly once).
 */
export class ScenarioContext {
  readonly scenario: Scenario;
  private readonly consumed = new Set<ScenarioKey>();

  constructor(scenario: Scenario) {
    this.scenario = scenario;
  }

  consume(key: ScenarioKey): void {
    if (SCENARIO_DEFS[key].oneShot && this.scenario[key] !== DEFAULT_SCENARIO[key]) {
      this.consumed.add(key);
    }
  }

  /** Cookie value after consumption, or null when nothing changed. */
  nextCookieValue(): string | null {
    if (this.consumed.size === 0) return null;
    const next = { ...this.scenario } as Record<ScenarioKey, string>;
    for (const key of SCENARIO_KEYS) {
      if (this.consumed.has(key)) next[key] = DEFAULT_SCENARIO[key];
    }
    return serializeScenario(next as Scenario);
  }
}
