import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { AnalyticsBatch } from "@your-app/shared";
import { GET as getInsights } from "@/app/api/admin/analytics/route";
import { POST as ingest } from "@/app/api/analytics/events/route";
import { DELETE as eraseMe } from "@/app/api/analytics/me/route";
import { CONSENT_COOKIE, VISITOR_COOKIE, analyticsAllowed, parseConsent, serializeConsent } from "@/lib/analytics/consent";
import { isRageClick } from "@/lib/analytics/dom";
import { pageGroup, sanitizePath, scrubText } from "@/lib/analytics/sanitize";
import { SAMPLE_NOW } from "../clock";
import { buildInsights, eraseVisitor, ingestBatch, MAX_EVENTS_PER_SESSION } from "../services/analytics";
import { DEMO_SESSIONS, generateDemoTraffic } from "../services/analytics-demo";
import { SESSION_COOKIE, createSession } from "../services/auth";
import { resetDb } from "../store";
import type { AnalyticsRecord, Db } from "../types";

let db: Db;
beforeEach(() => {
  db = resetDb();
});

const NOW = Date.UTC(2026, 10, 22, 12);
const GRANTED = serializeConsent({ version: 1, analytics: "granted", decidedAt: 1 });

function batch(events: Partial<AnalyticsBatch["events"][number]>[], ids = { visitorId: "visitor-1", sessionId: "session-1" }): AnalyticsBatch {
  return {
    ...ids,
    device: "desktop",
    events: events.map((e) => ({ type: "page_view", path: "/", at: NOW, props: {}, ...e })),
  };
}

let seq = 0;
function rec(sessionId: string, type: AnalyticsRecord["type"], path: string, at: number, props: AnalyticsRecord["props"] = {}, device: AnalyticsRecord["device"] = "desktop"): AnalyticsRecord {
  seq += 1;
  return { id: `t${String(seq)}`, visitorId: `v-${sessionId}`, sessionId, device, type, path, at, props, demo: false };
}

describe("consent cookie", () => {
  it("round-trips and only 'granted' allows tracking", () => {
    const raw = serializeConsent({ version: 1, analytics: "granted", decidedAt: 42 });
    expect(parseConsent(raw)).toEqual({ version: 1, analytics: "granted", decidedAt: 42 });
    expect(analyticsAllowed(raw)).toBe(true);
    expect(analyticsAllowed(serializeConsent({ version: 1, analytics: "denied", decidedAt: 1 }))).toBe(false);
  });

  it("treats missing, malformed or outdated cookies as undecided", () => {
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent("v0.analytics-granted.1")).toBeNull();
    expect(analyticsAllowed("v0.analytics-granted.1")).toBe(false);
  });
});

describe("PII scrubbing", () => {
  it("keeps only allow-listed query params", () => {
    expect(sanitizePath("/search?q=esv&email=a@b.co&returnTo=/x&token=abc&sort=price-asc")).toBe("/search?q=esv&sort=price-asc");
    expect(sanitizePath("/password/reset?token=secret")).toBe("/password/reset");
  });

  it("removes email addresses from free text", () => {
    expect(scrubText("contact jordan@example.com now")).toBe("contact [email] now");
    expect(sanitizePath("/search?q=me@example.com")).toBe("/search?q=%5Bemail%5D");
  });

  it("groups ids into page templates", () => {
    expect(pageGroup("/products/esv-study-bible?variant=X")).toBe("/products/[slug]");
    expect(pageGroup("/account/orders/BS-10428")).toBe("/account/orders/[id]");
    expect(pageGroup("/orders/BS-1/returns/RMA-2")).toBe("/orders/[id]/returns/[rma]");
    expect(pageGroup("/categories/study")).toBe("/categories/study");
  });
});

describe("rage clicks", () => {
  it("needs three quick clicks in one spot", () => {
    const a = { x: 10, y: 10, at: 0 };
    const b = { x: 12, y: 11, at: 200 };
    expect(isRageClick([a], b)).toBe(false);
    expect(isRageClick([a, b], { x: 11, y: 9, at: 400 })).toBe(true);
    expect(isRageClick([a, b], { x: 200, y: 9, at: 400 })).toBe(false);
    expect(isRageClick([a, b], { x: 11, y: 9, at: 1500 })).toBe(false);
  });
});

describe("ingest", () => {
  const ctx = { consentGranted: true, cookieVisitorId: "visitor-1", receivedAt: NOW };

  it("refuses without consent", () => {
    expect(() => ingestBatch(db, batch([{}]), { ...ctx, consentGranted: false })).toThrow(/consent/);
  });

  it("requires the visitor id from the cookie", () => {
    expect(() => ingestBatch(db, batch([{}]), { ...ctx, cookieVisitorId: "someone-else" })).toThrow(/Visitor id/);
  });

  it("stores sanitised events with clamped timestamps", () => {
    const before = db.analyticsEvents.length;
    ingestBatch(db, batch([{ path: "/search?q=esv&email=x@y.zz", at: NOW - 10 * 86_400_000, props: { target: "Mail me at x@y.zz" } }]), ctx);
    const stored = db.analyticsEvents.at(-1);
    expect(db.analyticsEvents.length).toBe(before + 1);
    expect(stored).toMatchObject({ path: "/search?q=esv", at: NOW, demo: false, props: { target: "Mail me at [email]" } });
  });

  it("caps events per session", () => {
    const events = Array.from({ length: 50 }, () => ({}));
    let accepted = 0;
    for (let i = 0; i < 25; i += 1) accepted += ingestBatch(db, batch(events), ctx);
    expect(accepted).toBe(MAX_EVENTS_PER_SESSION);
  });

  it("erases a visitor's history", () => {
    ingestBatch(db, batch([{}, {}]), ctx);
    expect(eraseVisitor(db, "visitor-1")).toBe(2);
    expect(db.analyticsEvents.some((e) => e.visitorId === "visitor-1")).toBe(false);
  });
});

describe("buildInsights", () => {
  const t = (min: number) => NOW - 60 * 60_000 + min * 60_000;
  const events = [
    // s1: full purchase
    rec("s1", "page_view", "/", t(0)),
    rec("s1", "page_view", "/products/esv-study-bible", t(1)),
    rec("s1", "page_leave", "/products/esv-study-bible", t(2), { dwellMs: 30_000, scroll: 80 }),
    rec("s1", "add_to_cart", "/products/esv-study-bible", t(2)),
    rec("s1", "page_view", "/cart", t(3)),
    rec("s1", "page_view", "/checkout/identity", t(4)),
    rec("s1", "purchase", "/orders/BS-1/confirmation", t(6)),
    // s2: bounce on home (mobile)
    rec("s2", "page_view", "/", t(5), {}, "mobile"),
    // s3: product, no cart, zero-result search, rage clicks
    rec("s3", "page_view", "/search?q=nkjv", t(7)),
    rec("s3", "search", "/search?q=nkjv", t(7), { q: "nkjv", results: 0 }),
    rec("s3", "page_view", "/products/kjv-large-print-bible", t(8)),
    rec("s3", "rage_click", "/products/kjv-large-print-bible", t(8), { target: "Product image" }),
    rec("s3", "rage_click", "/products/kjv-large-print-bible", t(8), { target: "Product image" }),
    // outside the range
    rec("old", "page_view", "/", NOW - 3 * 86_400_000),
  ];

  it("computes KPIs, funnel, paths and searches", () => {
    const r = buildInsights(events, { range: "1d", demo: "include" }, NOW);
    expect(r.kpis).toMatchObject({ sessions: 3, visitors: 3, pageViews: 7, bounceRate: 33.3, conversionRate: 33.3 });
    expect(r.funnel.map((s) => s.sessions)).toEqual([3, 2, 1, 1, 1]);
    expect(r.funnel[2]?.dropOff).toBe(50);
    expect(r.paths).toContainEqual({ from: "/", to: "/products/[slug]", count: 1 });
    expect(r.searches).toEqual([{ query: "nkjv", count: 1, zeroResults: 1 }]);
    expect(r.frictions[0]).toMatchObject({ kind: "rage_click", page: "/products/[slug]", target: "Product image", count: 2 });
    expect(r.topPages.find((p) => p.page === "/products/[slug]")).toMatchObject({ views: 2, avgSeconds: 30, avgScroll: 80 });
    expect(r.entryPages[0]).toEqual({ page: "/", count: 2 });
  });

  it("only counts a purchase reached in funnel order", () => {
    const skip = [rec("x", "page_view", "/", t(0)), rec("x", "purchase", "/orders/BS-2/confirmation", t(1))];
    expect(buildInsights(skip, { range: "1d", demo: "include" }, NOW).funnel.map((s) => s.sessions)).toEqual([1, 0, 0, 0, 0]);
  });

  it("recommends fixes for the measured problems", () => {
    const r = buildInsights([...events, ...events.map((e) => ({ ...e, sessionId: `${e.sessionId}b`, id: `${e.id}b` }))], { range: "1d", demo: "include" }, NOW);
    const titles = r.recommendations.map((x) => x.title).join(" | ");
    expect(titles).toMatch(/Rage clicks on “Product image”/);
    expect(titles).toMatch(/searches returned no results/);
  });

  it("can exclude demo traffic", () => {
    const demo = generateDemoTraffic(NOW, 20);
    expect(buildInsights(demo, { range: "14d", demo: "exclude" }, NOW).kpis.sessions).toBe(0);
    expect(buildInsights(demo, { range: "14d", demo: "include" }, NOW).kpis.sessions).toBeGreaterThan(0);
  });
});

describe("demo traffic", () => {
  it("is deterministic, flagged and within the last 14 days", () => {
    const a = generateDemoTraffic(NOW);
    const b = generateDemoTraffic(NOW);
    expect(a).toEqual(b);
    expect(a.every((e) => e.demo && e.at <= NOW && e.at >= NOW - 15 * 86_400_000)).toBe(true);
    expect(new Set(a.map((e) => e.sessionId)).size).toBe(DEMO_SESSIONS);
    expect(buildInsights(a, { range: "14d", demo: "include" }, NOW).kpis.conversionRate).toBeGreaterThan(0);
  });
});

describe("analytics routes", () => {
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

  it("ingest: 403 without consent, 200 with it", async () => {
    const body = batch([{}]);
    expect((await ingest(req("/api/analytics/events", { method: "POST", body, cookies: { [VISITOR_COOKIE]: "visitor-1" } }))).status).toBe(403);
    const ok = await ingest(
      req("/api/analytics/events", { method: "POST", body, cookies: { [VISITOR_COOKIE]: "visitor-1", [CONSENT_COOKIE]: GRANTED } }),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ accepted: 1 });
  });

  it("ingest: rejects malformed batches", async () => {
    const res = await ingest(
      req("/api/analytics/events", { method: "POST", body: { visitorId: "x" }, cookies: { [CONSENT_COOKIE]: GRANTED } }),
    );
    expect(res.status).toBe(422);
  });

  it("erase: deletes this visitor's events and cookies", async () => {
    ingestBatch(db, batch([{}]), { consentGranted: true, cookieVisitorId: "visitor-1", receivedAt: Date.now() });
    const res = await eraseMe(req("/api/analytics/me", { method: "DELETE", cookies: { [VISITOR_COOKIE]: "visitor-1" } }));
    expect(await res.json()).toEqual({ erased: 1 });
    expect(res.headers.get("set-cookie")).toContain(`${VISITOR_COOKIE}=;`);
  });

  it("insights: 401 signed out, 403 customer, 200 staff", async () => {
    expect((await getInsights(req("/api/admin/analytics"))).status).toBe(401);
    const user = (id: string) => {
      const found = db.users.find((u) => u.id === id);
      if (!found) throw new Error(id);
      return found;
    };
    const customer = createSession(db, user("cus_jordan"), SAMPLE_NOW);
    expect((await getInsights(req("/api/admin/analytics", { cookies: { [SESSION_COOKIE]: customer } }))).status).toBe(403);
    const staff = createSession(db, user("stf_support"), SAMPLE_NOW);
    const res = await getInsights(req("/api/admin/analytics?range=7d", { cookies: { [SESSION_COOKIE]: staff } }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { range: string }).range).toBe("7d");
  });
});
