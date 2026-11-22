// UX analytics: ingest (consented events only) and the insights report.
// Aggregations are pure functions over records so they port to SQL later.
import type { AnalyticsBatch, DeviceClass, Insights, InsightsQuery } from "@your-app/shared";
import { pageGroup, sanitizePath, scrubText } from "@/lib/analytics/sanitize";
import { MockApiError } from "../http";
import { nextId } from "../store";
import type { AnalyticsRecord, Db } from "../types";

/** Per-session cap so a runaway client can't flood the store. */
export const MAX_EVENTS_PER_SESSION = 1000;
/** Events older than this or in the future are clamped to receive time. */
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<InsightsQuery["range"], number> = { "1d": 1, "7d": 7, "14d": 14, "30d": 30 };

export type IngestContext = {
  consentGranted: boolean;
  /** Visitor id from the first-party cookie; must match the batch. */
  cookieVisitorId: string | undefined;
  receivedAt: number;
};

export function ingestBatch(db: Db, batch: AnalyticsBatch, ctx: IngestContext): number {
  if (!ctx.consentGranted) {
    throw new MockApiError("forbidden", "Analytics consent has not been granted.");
  }
  if (ctx.cookieVisitorId !== batch.visitorId) {
    throw new MockApiError("validation_failed", "Visitor id does not match the analytics cookie.");
  }
  const existing = db.analyticsEvents.filter((e) => e.sessionId === batch.sessionId).length;
  const room = Math.max(0, MAX_EVENTS_PER_SESSION - existing);
  const accepted = batch.events.slice(0, room);
  for (const event of accepted) {
    const skewed = Math.abs(event.at - ctx.receivedAt) > MAX_CLOCK_SKEW_MS;
    const props: AnalyticsRecord["props"] = {};
    for (const [key, value] of Object.entries(event.props)) {
      props[key] = typeof value === "string" ? scrubText(value, 120) : value;
    }
    db.analyticsEvents.push({
      id: nextId(db, "evt"),
      visitorId: batch.visitorId,
      sessionId: batch.sessionId,
      device: batch.device,
      type: event.type,
      path: sanitizePath(event.path),
      at: skewed ? ctx.receivedAt : event.at,
      props,
      demo: false,
    });
  }
  return accepted.length;
}

/** Right to erasure: removes every event recorded for this visitor. */
export function eraseVisitor(db: Db, visitorId: string | undefined): number {
  if (!visitorId) return 0;
  const before = db.analyticsEvents.length;
  db.analyticsEvents = db.analyticsEvents.filter((e) => e.visitorId !== visitorId);
  return before - db.analyticsEvents.length;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

type Session = {
  id: string;
  visitorId: string;
  device: DeviceClass;
  events: AnalyticsRecord[];
  views: AnalyticsRecord[];
};

const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round((part / whole) * 100));

function groupSessions(events: AnalyticsRecord[]): Session[] {
  const byId = new Map<string, Session>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    let s = byId.get(e.sessionId);
    if (!s) {
      s = { id: e.sessionId, visitorId: e.visitorId, device: e.device, events: [], views: [] };
      byId.set(e.sessionId, s);
    }
    s.events.push(e);
    if (e.type === "page_view") s.views.push(e);
  }
  return [...byId.values()].filter((s) => s.views.length > 0);
}

const isProduct = (p: string) => p.startsWith("/products/");
const isCheckout = (p: string) => p.startsWith("/checkout/");

/** The purchase funnel, counted per session and in order. */
export const FUNNEL_STEPS = ["Visited store", "Viewed a product", "Added to cart", "Started checkout", "Purchased"] as const;

function funnelDepth(s: Session): number {
  let depth = 1;
  let reached = false;
  for (const e of s.events) {
    if (depth === 1 && e.type === "page_view" && isProduct(e.path)) depth = 2;
    else if (depth === 2 && e.type === "add_to_cart") depth = 3;
    else if (depth === 3 && e.type === "page_view" && isCheckout(e.path)) depth = 4;
    else if (depth === 4 && e.type === "purchase") {
      depth = 5;
      reached = true;
    }
    if (reached) break;
  }
  return depth;
}

function topN<T>(entries: Map<string, T>, score: (v: T) => number, n: number): [string, T][] {
  return [...entries.entries()].sort((a, b) => score(b[1]) - score(a[1]) || a[0].localeCompare(b[0])).slice(0, n);
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

export function buildInsights(all: AnalyticsRecord[], query: InsightsQuery, now: number): Insights {
  const days = RANGE_DAYS[query.range];
  const since = now - days * DAY_MS;
  const events = all.filter((e) => e.at >= since && e.at <= now && (query.demo === "include" || !e.demo));
  const sessions = groupSessions(events);
  const pageViews = sessions.reduce((n, s) => n + s.views.length, 0);

  // Session duration: first to last event.
  const durations = sessions.map((s) => {
    const first = s.events[0]?.at ?? 0;
    const last = s.events.at(-1)?.at ?? first;
    return (last - first) / 1000;
  });
  const leaves = events.filter((e) => e.type === "page_leave");
  const scrolls = leaves.map((e) => Number(e.props.scroll ?? 0)).filter((n) => Number.isFinite(n));
  const purchasedSessions = sessions.filter((s) => s.events.some((e) => e.type === "purchase"));

  // Daily series.
  const daily: Insights["daily"] = [];
  for (let d = days - 1; d >= 0; d -= 1) {
    const start = new Date(now - d * DAY_MS);
    const date = start.toISOString().slice(0, 10);
    daily.push({ date, sessions: 0, purchases: 0 });
  }
  const dailyIndex = new Map(daily.map((d, i) => [d.date, i]));
  for (const s of sessions) {
    const date = new Date(s.events[0]?.at ?? now).toISOString().slice(0, 10);
    const i = dailyIndex.get(date);
    if (i === undefined) continue;
    const row = daily[i];
    if (!row) continue;
    row.sessions += 1;
    if (purchasedSessions.includes(s)) row.purchases += 1;
  }

  // Funnel.
  const depths = sessions.map(funnelDepth);
  const funnelCounts = FUNNEL_STEPS.map((_, i) => depths.filter((d) => d >= i + 1).length);
  const funnel = FUNNEL_STEPS.map((step, i) => {
    const count = funnelCounts[i] ?? 0;
    const prev = i === 0 ? count : (funnelCounts[i - 1] ?? 0);
    return { step, sessions: count, dropOff: i === 0 ? 0 : round(100 - pct(count, prev)) };
  });

  // Pages: views, sessions, dwell, scroll, exits.
  type PageStat = { views: number; sessions: Set<string>; dwell: number[]; scroll: number[]; exits: number };
  const pages = new Map<string, PageStat>();
  const pageStat = (page: string) => {
    let p = pages.get(page);
    if (!p) {
      p = { views: 0, sessions: new Set(), dwell: [], scroll: [], exits: 0 };
      pages.set(page, p);
    }
    return p;
  };
  const transitions = new Map<string, number>();
  const entries = new Map<string, number>();
  const exits = new Map<string, number>();
  for (const s of sessions) {
    s.views.forEach((v, i) => {
      const page = pageGroup(v.path);
      const stat = pageStat(page);
      stat.views += 1;
      stat.sessions.add(s.id);
      const prev = s.views[i - 1];
      if (prev) {
        const from = pageGroup(prev.path);
        if (from !== page) bump(transitions, `${from}\u0000${page}`);
      }
    });
    const first = s.views[0];
    const last = s.views.at(-1);
    if (first) bump(entries, pageGroup(first.path));
    if (last) {
      const page = pageGroup(last.path);
      bump(exits, page);
      pageStat(page).exits += 1;
    }
  }
  for (const e of leaves) {
    const stat = pageStat(pageGroup(e.path));
    const dwell = Number(e.props.dwellMs ?? 0);
    const scroll = Number(e.props.scroll ?? 0);
    if (Number.isFinite(dwell) && dwell > 0) stat.dwell.push(dwell / 1000);
    if (Number.isFinite(scroll)) stat.scroll.push(scroll);
  }
  const avg = (xs: number[]) => (xs.length === 0 ? 0 : round(xs.reduce((a, b) => a + b, 0) / xs.length));
  const topPages = topN(pages, (p) => p.views, 12).map(([page, p]) => ({
    page,
    views: p.views,
    sessions: p.sessions.size,
    avgSeconds: avg(p.dwell),
    avgScroll: avg(p.scroll),
    exitRate: pct(p.exits, p.views),
  }));

  // Searches.
  const searches = new Map<string, { count: number; zeroResults: number }>();
  for (const e of events.filter((x) => x.type === "search")) {
    const q = String(e.props.q ?? "").trim().toLowerCase();
    if (!q) continue;
    const row = searches.get(q) ?? { count: 0, zeroResults: 0 };
    row.count += 1;
    if (Number(e.props.results ?? 1) === 0) row.zeroResults += 1;
    searches.set(q, row);
  }

  // Clicks and friction.
  const clicks = new Map<string, number>();
  const friction = new Map<string, number>();
  for (const e of events) {
    const target = String(e.props.target ?? e.props.message ?? "unknown");
    if (e.type === "click") bump(clicks, `${pageGroup(e.path)}\u0000${target}`);
    if (e.type === "rage_click" || e.type === "dead_click" || e.type === "js_error") {
      bump(friction, `${e.type}\u0000${pageGroup(e.path)}\u0000${target}`);
    }
  }

  // Devices.
  const deviceRows = (["desktop", "mobile", "tablet"] as const).map((device) => {
    const ds = sessions.filter((s) => s.device === device);
    return { device, sessions: ds.length, conversionRate: pct(ds.filter((s) => purchasedSessions.includes(s)).length, ds.length) };
  });

  const insights: Insights = {
    range: query.range,
    includesDemo: query.demo === "include",
    generatedAt: new Date(now).toISOString(),
    kpis: {
      sessions: sessions.length,
      visitors: new Set(sessions.map((s) => s.visitorId)).size,
      pageViews,
      pagesPerSession: sessions.length ? round(pageViews / sessions.length) : 0,
      avgSessionSeconds: avg(durations),
      bounceRate: pct(sessions.filter((s) => s.views.length === 1).length, sessions.length),
      conversionRate: pct(purchasedSessions.length, sessions.length),
      avgScrollDepth: avg(scrolls),
    },
    daily,
    funnel,
    topPages,
    paths: topN(transitions, (n) => n, 12).map(([key, count]) => {
      const [from = "", to = ""] = key.split("\u0000");
      return { from, to, count };
    }),
    entryPages: topN(entries, (n) => n, 6).map(([page, count]) => ({ page, count })),
    exitPages: topN(exits, (n) => n, 6).map(([page, count]) => ({ page, count })),
    searches: topN(searches, (s) => s.count * 1000 + s.zeroResults, 10).map(([query, s]) => ({ query, ...s })),
    topClicks: topN(clicks, (n) => n, 10).map(([key, count]) => {
      const [page = "", target = ""] = key.split("\u0000");
      return { page, target, count };
    }),
    frictions: topN(friction, (n) => n, 10).map(([key, count]) => {
      const [kind = "dead_click", page = "", target = ""] = key.split("\u0000");
      return { kind: kind as Insights["frictions"][number]["kind"], page, target, count };
    }),
    devices: deviceRows,
    recommendations: [],
  };
  insights.recommendations = recommend(insights);
  return insights;
}

/**
 * Turns the numbers into prioritised UX suggestions. Thresholds are
 * deliberately simple and documented so the team can tune them.
 */
export function recommend(insights: Omit<Insights, "recommendations">): Insights["recommendations"] {
  const recs: Insights["recommendations"] = [];
  const { funnel, kpis } = insights;
  if (kpis.sessions < 5) return recs;

  const FUNNEL_ADVICE: Record<string, string> = {
    "Viewed a product":
      "Few visitors reach a product page. Make category tiles and search more prominent on landing pages, and surface bestsellers above the fold.",
    "Added to cart":
      "Visitors view products but don't add them. Check that price, stock and delivery estimate sit next to Add to cart, and that variant choices are clear.",
    "Started checkout":
      "Carts are abandoned before checkout. Show the full total (shipping and tax) in the cart and keep guest checkout as the most prominent path.",
    Purchased:
      "Checkout is started but not finished. Review the step with the highest exits below, reduce form fields and keep the order summary visible.",
  };
  const worst = funnel.slice(1).reduce<(typeof funnel)[number] | null>((w, s) => (!w || s.dropOff > w.dropOff ? s : w), null);
  for (const step of funnel.slice(1)) {
    if (step.dropOff < 50) continue;
    recs.push({
      id: `funnel-${step.step}`,
      severity: step === worst && step.dropOff >= 60 ? "high" : "medium",
      title: `${String(step.dropOff)}% drop-off before “${step.step}”`,
      evidence: `${String(step.sessions)} sessions reached this step.`,
      suggestion: FUNNEL_ADVICE[step.step] ?? "Investigate this step.",
    });
  }

  for (const f of insights.frictions.filter((x) => x.kind === "rage_click" && x.count >= 2).slice(0, 3)) {
    recs.push({
      id: `rage-${f.page}-${f.target}`,
      severity: f.count >= 5 ? "high" : "medium",
      title: `Rage clicks on “${f.target}”`,
      evidence: `${String(f.count)} rapid repeated clicks on ${f.page}.`,
      suggestion: "Visitors expect this to respond. Make the control respond immediately, show a loading state, or explain why it is disabled.",
    });
  }
  for (const f of insights.frictions.filter((x) => x.kind === "dead_click" && x.count >= 3).slice(0, 2)) {
    recs.push({
      id: `dead-${f.page}-${f.target}`,
      severity: "medium",
      title: `People click “${f.target}”, which does nothing`,
      evidence: `${String(f.count)} clicks on a non-interactive element on ${f.page}.`,
      suggestion: "Make it interactive (for example open a zoom view or link to the product), or restyle it so it doesn't look clickable.",
    });
  }
  const zero = insights.searches.filter((s) => s.zeroResults > 0);
  if (zero.length > 0) {
    const total = zero.reduce((n, s) => n + s.zeroResults, 0);
    recs.push({
      id: "search-zero",
      severity: total >= 5 ? "high" : "low",
      title: `${String(total)} searches returned no results`,
      evidence: `Top: ${zero
        .slice(0, 3)
        .map((s) => `“${s.query}”`)
        .join(", ")}.`,
      suggestion: "Add synonyms or redirects for these terms, stock the requested translations, or show suggestions on the no-results page.",
    });
  }
  for (const page of insights.topPages.filter((p) => p.views >= 10 && p.avgScroll > 0 && p.avgScroll < 45).slice(0, 2)) {
    recs.push({
      id: `scroll-${page.page}`,
      severity: "low",
      title: `Most visitors don't scroll far on ${page.page}`,
      evidence: `Average scroll depth ${String(page.avgScroll)}% over ${String(page.views)} views.`,
      suggestion: "Move the most important content and calls to action higher on the page.",
    });
  }
  for (const page of insights.topPages.filter((p) => p.views >= 10 && p.exitRate >= 60).slice(0, 2)) {
    recs.push({
      id: `exit-${page.page}`,
      severity: "medium",
      title: `High exit rate on ${page.page}`,
      evidence: `${String(page.exitRate)}% of views are the last page in the session.`,
      suggestion: "Add clear next steps (related products, continue shopping, help links) and check for errors on this page.",
    });
  }
  const desktop = insights.devices.find((d) => d.device === "desktop");
  const mobile = insights.devices.find((d) => d.device === "mobile");
  if (desktop && mobile && mobile.sessions >= 10 && desktop.conversionRate > 0 && mobile.conversionRate < desktop.conversionRate * 0.6) {
    recs.push({
      id: "mobile-conversion",
      severity: "high",
      title: "Mobile converts much worse than desktop",
      evidence: `Mobile ${String(mobile.conversionRate)}% vs desktop ${String(desktop.conversionRate)}%.`,
      suggestion: "Test the mobile checkout: tap target sizes, keyboard types on form fields, and a sticky order total.",
    });
  }
  if (kpis.bounceRate >= 55) {
    recs.push({
      id: "bounce",
      severity: "medium",
      title: `${String(kpis.bounceRate)}% of sessions view a single page`,
      evidence: `Top entry page: ${insights.entryPages[0]?.page ?? "n/a"}.`,
      suggestion: "Strengthen the landing pages: clearer value proposition, visible search, and links into popular categories.",
    });
  }
  const order = { high: 0, medium: 1, low: 2 } as const;
  return recs.sort((a, b) => order[a.severity] - order[b.severity]);
}
