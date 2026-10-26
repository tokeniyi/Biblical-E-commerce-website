import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SCENARIO_COOKIE } from "@/lib/dev/scenario-defs";
import { proxy } from "../proxy";

function get(url: string, cookie?: string) {
  return proxy(new NextRequest(url, { headers: cookie ? { cookie } : {} }));
}

describe("proxy ?scenario= handling", () => {
  it("passes through requests without a preset", () => {
    const res = get("http://localhost/cart");
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.cookies.get(SCENARIO_COOKIE)).toBeUndefined();
  });

  it("stores the preset and redirects to the clean URL, keeping other params", () => {
    const res = get("http://localhost/orders/BS-10428/tracking?x=1&scenario=order:shipped");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/orders/BS-10428/tracking?x=1");
    expect(res.cookies.get(SCENARIO_COOKIE)?.value).toBe("order:shipped");
  });

  it("merges with flags already in the cookie", () => {
    const res = get("http://localhost/?scenario=payment:declined", `${SCENARIO_COOKIE}=latency:800`);
    expect(res.cookies.get(SCENARIO_COOKIE)?.value).toBe("payment:declined,latency:800");
  });

  it("clears every flag with scenario=clear", () => {
    const res = get("http://localhost/?scenario=clear", `${SCENARIO_COOKIE}=latency:800`);
    expect(res.cookies.get(SCENARIO_COOKIE)?.value).toBe("");
  });
});
