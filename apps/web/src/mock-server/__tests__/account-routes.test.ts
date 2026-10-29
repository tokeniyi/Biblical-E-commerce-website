import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getOverview } from "@/app/api/account/route";
import { GET as getOrder } from "@/app/api/account/orders/[id]/route";
import { DELETE as deleteAddress } from "@/app/api/account/addresses/[id]/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { GET as verification } from "@/app/api/auth/verification/route";
import { POST as verify } from "@/app/api/auth/verify-email/route";
import { POST as preset } from "@/app/api/%5F_dev/as/route";
import { SAMPLE_NOW } from "../clock";
import { SEED_PASSWORD } from "../seed";
import { CART_COOKIE, PENDING_VERIFICATION_COOKIE, SESSION_COOKIE, createSession, expireSession } from "../services/auth";
import { ensureCart } from "../services/cart";
import { resetDb } from "../store";
import type { Db } from "../types";

let db: Db;
beforeEach(() => {
  db = resetDb();
});

function req(path: string, init: { method?: string; body?: unknown; cookies?: Record<string, string> } = {}) {
  const cookie = Object.entries(init.cookies ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: { ...(cookie ? { cookie } : {}), ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

function sessionFor(userId: string): string {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error(userId);
  return createSession(db, user, SAMPLE_NOW);
}

describe("auth routes", () => {
  it("login sets an httpOnly session cookie and switches the browser to the merged cart", async () => {
    const account = ensureCart(db, undefined);
    account.customerId = "cus_jordan";
    account.lines = [{ sku: "KJV-LP-LL", quantity: 1, unitPriceCents: 3200 }];
    const browser = ensureCart(db, undefined);
    browser.lines = [{ sku: "ESV-ST-HC", quantity: 1, unitPriceCents: 3900 }];

    const res = await login(
      req("/api/auth/login", {
        method: "POST",
        body: { email: "jordan@example.com", password: SEED_PASSWORD, returnTo: "/checkout/delivery" },
        cookies: { [CART_COOKIE]: browser.token },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ returnTo: "/checkout/delivery", pendingSave: null });
    expect(res.cookies.get(SESSION_COOKIE)).toMatchObject({ httpOnly: true });
    expect(res.cookies.get(CART_COOKIE)?.value).toBe(account.token);
    expect(account.lines.map((l) => l.sku)).toEqual(["KJV-LP-LL", "ESV-ST-HC"]);
  });

  it("E09 is a 401 with the generic message and no cookie", async () => {
    const res = await login(req("/api/auth/login", { method: "POST", body: { email: "nobody@example.com", password: "x" } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_credentials", message: "Email or password is incorrect" } });
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("register remembers the pending address for A03; the link signs in", async () => {
    const res = await registerRoute(
      req("/api/auth/register", {
        method: "POST",
        body: {
          firstName: "Casey",
          lastName: "Nguyen",
          email: "casey@example.com",
          password: "a long enough passphrase",
          confirmPassword: "a long enough passphrase",
          termsAccepted: true,
        },
      }),
    );
    const pending = res.cookies.get(PENDING_VERIFICATION_COOKIE)?.value ?? "";
    expect(pending).not.toBe("");
    const status = await verification(req("/api/auth/verification", { cookies: { [PENDING_VERIFICATION_COOKIE]: pending } }));
    expect(await status.json()).toEqual({ email: "casey@example.com", verified: false });

    const token = new URL(db.outbox[0]?.link ?? "", "http://x").searchParams.get("token") ?? "";
    const verified = await verify(req("/api/auth/verify-email", { method: "POST", body: { token } }));
    expect(verified.status).toBe(200);
    expect(verified.cookies.get(SESSION_COOKIE)?.value).toMatch(/^ses_/);
  });
});

describe("account routes re-check the session (A14 / E11)", () => {
  it("signed out is unauthenticated; an expired session is session_expired", async () => {
    expect(await (await getOverview(req("/api/account"))).json()).toMatchObject({ error: { code: "unauthenticated" } });
    const jordan = sessionFor("cus_jordan");
    expireSession(db, jordan, SAMPLE_NOW);
    const res = await getOverview(req("/api/account", { cookies: { [SESSION_COOKIE]: jordan } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "session_expired" } });
  });

  it("a staff session is not a customer session", async () => {
    const alex = sessionFor("stf_alex");
    expect((await getOverview(req("/api/account", { cookies: { [SESSION_COOKIE]: alex } }))).status).toBe(401);
  });

  it("another customer's order or address is a plain 404", async () => {
    const sam = sessionFor("cus_sam");
    const order = await getOrder(req("/api/account/orders/BS-10428", { cookies: { [SESSION_COOKIE]: sam } }), params({ id: "BS-10428" }));
    expect(order.status).toBe(404);
    const address = await deleteAddress(
      req("/api/account/addresses/addr_jordan_home", { method: "DELETE", cookies: { [SESSION_COOKIE]: sam } }),
      params({ id: "addr_jordan_home" }),
    );
    expect(address.status).toBe(404);
    expect(db.users.find((u) => u.id === "cus_jordan")).toMatchObject({ addresses: [{ id: "addr_jordan_home" }] });
  });
});

describe("dev screen presets", () => {
  it("signs in as the preset identity and redirects to a same-origin path only", async () => {
    const res = await preset(req("/api/__dev/as?identity=customer&next=%2F%2Fevil.example", { method: "POST" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(res.cookies.get(SESSION_COOKIE)?.value).toMatch(/^ses_/);
  });
});
