import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { SCENARIO_COOKIE } from "@/lib/dev/scenario-defs";
import { MockApiError, mockHandler } from "../http";
import { resetDb } from "../store";

beforeEach(() => {
  resetDb();
});

function request(method: string, scenario = "") {
  return new NextRequest("http://localhost/api/thing", {
    method,
    headers: scenario ? { cookie: `${SCENARIO_COOKIE}=${scenario}` } : {},
  });
}

const ok = mockHandler(() => NextResponse.json({ ok: true }));

describe("mockHandler", () => {
  it("passes through when no scenario is set", async () => {
    const res = await ok(request("GET"));
    expect(res.status).toBe(200);
    expect(res.cookies.get(SCENARIO_COOKIE)).toBeUndefined();
  });

  it("fails the next read once and clears the one-shot flag", async () => {
    const res = await ok(request("GET", "network:fail-read~t1,payment:declined"));
    expect(res.status).toBe(503);
    // The sticky payment flag survives; the one-shot network flag is consumed.
    expect(res.cookies.get(SCENARIO_COOKIE)?.value).toBe("payment:declined");
  });

  it("fires a one-shot flag once even if the clearing cookie never reaches the browser", async () => {
    // Server Components fetch with the browser's cookie; their Set-Cookie is
    // dropped, so the same stale cookie arrives again on the next request.
    const stale = "network:fail-read~t2";
    expect((await ok(request("GET", stale))).status).toBe(503);
    expect((await ok(request("GET", stale))).status).toBe(200);
    expect((await ok(request("GET", stale))).status).toBe(200);
  });

  it("fires again when the flag is re-set with a new token", async () => {
    expect((await ok(request("GET", "network:fail-read~t3"))).status).toBe(503);
    expect((await ok(request("GET", "network:fail-read~t4"))).status).toBe(503);
  });

  it("exempts page chrome from faults so they reach page data", async () => {
    const chrome = mockHandler(() => NextResponse.json({ ok: true }), { chrome: true });
    expect((await chrome(request("GET", "network:fail-read~t5"))).status).toBe(200);
    expect((await ok(request("GET", "network:fail-read~t5"))).status).toBe(503);
  });

  it("does not spend fail-write on a read", async () => {
    const res = await ok(request("GET", "network:fail-write"));
    expect(res.status).toBe(200);
    expect(res.cookies.get(SCENARIO_COOKIE)).toBeUndefined();
  });

  it("fails the next write", async () => {
    const res = await ok(request("POST", "network:fail-write"));
    expect(res.status).toBe(503);
    expect(res.cookies.get(SCENARIO_COOKIE)?.value).toBe("");
  });

  it("hides dev endpoints when mock tools are off", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_TOOLS", "0");
    try {
      const dev = mockHandler(() => NextResponse.json({ ok: true }), { dev: true });
      expect((await dev(request("POST"))).status).toBe(404);
      // Non-dev handlers are unaffected.
      expect((await ok(request("GET"))).status).toBe(200);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("never fails dev endpoints", async () => {
    const dev = mockHandler(() => NextResponse.json({ ok: true }), { dev: true });
    expect((await dev(request("GET", "network:fail-read"))).status).toBe(200);
  });

  it("renders MockApiError as the error envelope", async () => {
    const failing = mockHandler(() => {
      throw new MockApiError("version_conflict", "Changed elsewhere", undefined, { version: 12 });
    });
    const res = await failing(request("POST"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "version_conflict", message: "Changed elsewhere", details: { version: 12 } },
    });
  });
});

describe("api client against mock handlers", () => {
  function clientFor(handler: (req: NextRequest) => Promise<NextResponse>, scenario = "") {
    return createApiClient({
      baseUrl: "http://localhost",
      fetch: (input, init) =>
        handler(
          new NextRequest(input instanceof Request ? input.url : input, {
            ...(init as ConstructorParameters<typeof NextRequest>[1]),
            headers: scenario ? { cookie: `${SCENARIO_COOKIE}=${scenario}` } : {},
          }),
        ),
    });
  }

  it("maps a simulated outage to network_error (E18)", async () => {
    const client = clientFor(ok, "network:fail-read");
    await expect(client.dev.getInbox()).rejects.toMatchObject({ code: "network_error" });
  });

  it("maps the error envelope to ApiError with field errors", async () => {
    const failing = mockHandler(() => {
      throw new MockApiError("validation_failed", "Check the form", { zip: ["Enter a 5-digit ZIP code"] });
    });
    await expect(clientFor(failing).dev.reset()).rejects.toMatchObject({
      code: "validation_failed",
      status: 422,
      fieldErrors: { zip: ["Enter a 5-digit ZIP code"] },
    });
  });

  it("rejects responses that break the contract", async () => {
    const wrongShape = mockHandler(() => NextResponse.json({ approved: "lots" }));
    await expect(clientFor(wrongShape).dev.approveReviews()).rejects.toMatchObject({ code: "internal" });
  });
});
