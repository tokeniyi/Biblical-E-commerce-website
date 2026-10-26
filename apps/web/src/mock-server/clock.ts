// DELETE-ME-LATER: part of the mock server (spec §1.1).
import type { Scenario } from "@/lib/dev/scenario-defs";

/** Fixture "now": 7 Oct 2026 10:42, the date BS-10428 was placed. */
export const SAMPLE_NOW = new Date("2026-10-07T10:42:00.000Z");

export function now(scenario: Pick<Scenario, "clock">): Date {
  return scenario.clock === "real" ? new Date() : new Date(SAMPLE_NOW);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
