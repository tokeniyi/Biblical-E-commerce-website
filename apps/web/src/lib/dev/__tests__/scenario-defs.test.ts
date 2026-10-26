import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENARIO,
  activeFlags,
  mergeScenarioParam,
  parseScenario,
  serializeScenario,
} from "../scenario-defs";

describe("parseScenario", () => {
  it("returns defaults for an empty cookie", () => {
    expect(parseScenario(undefined)).toEqual(DEFAULT_SCENARIO);
  });

  it("reads known flags", () => {
    const s = parseScenario("payment:declined,latency:800");
    expect(s.payment).toBe("declined");
    expect(s.latency).toBe("800");
    expect(s.shipping).toBe("supported");
  });

  it("ignores unknown keys and invalid values", () => {
    const s = parseScenario("payment:free,teapot:yes,network:fail-read");
    expect(s.payment).toBe("paid");
    expect(s.network).toBe("fail-read");
  });

  it("accepts URL-encoded values", () => {
    expect(parseScenario("payment%3Adeclined").payment).toBe("declined");
  });

  it("survives malformed percent-encoding", () => {
    expect(parseScenario("%E0%A4%A")).toEqual(DEFAULT_SCENARIO);
  });
});

describe("serializeScenario", () => {
  it("omits defaults and round-trips", () => {
    const s = { ...DEFAULT_SCENARIO, payment: "pending" as const, order: "shipped" as const };
    const raw = serializeScenario(s);
    expect(raw).toBe("payment:pending,order:shipped");
    expect(parseScenario(raw)).toEqual(s);
  });

  it("serializes all defaults to an empty string", () => {
    expect(serializeScenario(DEFAULT_SCENARIO)).toBe("");
  });
});

describe("mergeScenarioParam", () => {
  it("layers the URL param over the cookie", () => {
    expect(mergeScenarioParam("latency:800", "payment:declined")).toBe("payment:declined,latency:800");
  });

  it("clears everything with ?scenario=clear", () => {
    expect(mergeScenarioParam("latency:800", "clear")).toBe("");
  });
});

describe("one-shot tokens", () => {
  const token = () => "tok";

  it("gives a newly set one-shot flag a token", () => {
    expect(mergeScenarioParam("", "network:fail-read", token)).toBe("network:fail-read~tok");
  });

  it("keeps existing tokens for flags that are not re-set", () => {
    expect(mergeScenarioParam("network:fail-read~old", "payment:declined", token)).toBe(
      "payment:declined,network:fail-read~old",
    );
  });

  it("issues a new token when a one-shot flag is re-set", () => {
    expect(mergeScenarioParam("network:fail-read~old", "network:fail-read", token)).toBe(
      "network:fail-read~tok",
    );
  });

  it("reads the flag value regardless of its token", () => {
    expect(parseScenario("network:fail-write~abc").network).toBe("fail-write");
  });
});

describe("activeFlags", () => {
  it("lists only non-default flags", () => {
    expect(activeFlags(parseScenario("clock:real,promo:expired"))).toEqual(["promo", "clock"]);
  });
});
