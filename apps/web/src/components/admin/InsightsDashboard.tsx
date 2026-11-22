"use client";

import { useEffect, useState } from "react";
import type { Insights, InsightsQuery } from "@your-app/shared";
import { Icon } from "@/components/ui/Icon";
import { badge, panel } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: Insights };

const RANGES: { value: InsightsQuery["range"]; label: string }[] = [
  { value: "1d", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
];

const SEVERITY: Record<string, string> = {
  high: "bg-danger/10 text-danger",
  medium: "bg-gold-soft text-warning",
  low: "bg-focus/10 text-focus",
};

const fmtSeconds = (s: number) => (s >= 60 ? `${String(Math.floor(s / 60))}m ${String(Math.round(s % 60))}s` : `${String(Math.round(s))}s`);

/**
 * UX insights from consented navigation analytics: KPIs, the purchase
 * funnel, navigation paths, friction (rage/dead clicks, errors), searches
 * and generated recommendations. Filters sit in one row above the charts.
 */
export function InsightsDashboard() {
  const [query, setQuery] = useState<InsightsQuery>({ range: "14d", demo: "include" });
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: "loading" });
    api.admin
      .insights(query)
      .then((data) => {
        if (!cancelled) setLoad({ status: "ready", data });
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoad({ status: "error", message: e instanceof ApiError ? e.message : "Couldn’t load insights." });
      });
    return () => {
      cancelled = true;
    };
  }, [query, refreshKey]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-white p-4" role="group" aria-label="Report filters">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Date range
          <select
            value={query.range}
            onChange={(e) => { setQuery((q) => ({ ...q, range: e.target.value as InsightsQuery["range"] })); }}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                Last {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={query.demo === "exclude"}
            onChange={(e) => { setQuery((q) => ({ ...q, demo: e.target.checked ? "exclude" : "include" })); }}
          />
          Live visitors only (hide seeded demo traffic)
        </label>
        <button
          type="button"
          onClick={() => { setRefreshKey((k) => k + 1); }}
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/25 px-4 text-sm font-semibold hover:border-ink"
        >
          <Icon name="rotate" className="h-4 w-4" /> Refresh
        </button>
      </div>

      {load.status === "loading" ? (
        <p role="status" aria-busy="true" className={panel}>
          Loading insights…
        </p>
      ) : load.status === "error" ? (
        <p role="alert" className={`${panel} text-danger`}>
          {load.message}
        </p>
      ) : (
        <Report data={load.data} />
      )}
    </div>
  );
}

function Report({ data }: { data: Insights }) {
  const k = data.kpis;
  if (k.sessions === 0) {
    return (
      <p role="status" className={panel}>
        No sessions in this range yet. Browse the store with analytics accepted, then refresh.
      </p>
    );
  }
  const tiles = [
    { label: "Sessions", value: k.sessions.toLocaleString("en-US") },
    { label: "Visitors", value: k.visitors.toLocaleString("en-US") },
    { label: "Pages / session", value: String(k.pagesPerSession) },
    { label: "Avg. session", value: fmtSeconds(k.avgSessionSeconds) },
    { label: "Bounce rate", value: `${String(k.bounceRate)}%` },
    { label: "Conversion", value: `${String(k.conversionRate)}%` },
    { label: "Avg. scroll depth", value: `${String(k.avgScrollDepth)}%` },
  ];
  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7" aria-label="Key metrics">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-medium text-muted">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{t.value}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="recs-heading" className={panel}>
        <h2 id="recs-heading" className="font-display text-xl font-semibold">
          Recommended UX improvements
        </h2>
        {data.recommendations.length === 0 ? (
          <p className="text-sm text-muted">Nothing stands out in this range.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {data.recommendations.map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${badge} ${SEVERITY[r.severity] ?? ""}`}>{r.severity} priority</span>
                  <h3 className="font-semibold">{r.title}</h3>
                </div>
                <p className="mt-1 text-sm text-muted">{r.evidence}</p>
                <p className="mt-1 text-sm">{r.suggestion}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="daily-heading" className={panel}>
          <h2 id="daily-heading" className="font-display text-xl font-semibold">
            Sessions per day
          </h2>
          <DailyChart daily={data.daily} />
        </section>
        <section aria-labelledby="funnel-heading" className={panel}>
          <h2 id="funnel-heading" className="font-display text-xl font-semibold">
            Purchase funnel
          </h2>
          <Funnel funnel={data.funnel} />
        </section>
      </div>

      <section aria-labelledby="paths-heading" className={panel}>
        <h2 id="paths-heading" className="font-display text-xl font-semibold">
          Navigation paths
        </h2>
        <p className="text-sm text-muted">Most common page-to-page moves within a session.</p>
        <Table
          caption="Navigation paths"
          head={["From", "To", "Sessions"]}
          rows={data.paths.map((p) => [p.from, p.to, String(p.count)])}
          bar={data.paths.map((p) => p.count)}
        />
      </section>

      <section aria-labelledby="pages-heading" className={panel}>
        <h2 id="pages-heading" className="font-display text-xl font-semibold">
          Pages
        </h2>
        <Table
          caption="Top pages"
          head={["Page", "Views", "Sessions", "Avg. time", "Avg. scroll", "Exit rate"]}
          rows={data.topPages.map((p) => [
            p.page,
            String(p.views),
            String(p.sessions),
            fmtSeconds(p.avgSeconds),
            `${String(p.avgScroll)}%`,
            `${String(p.exitRate)}%`,
          ])}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="friction-heading" className={panel}>
          <h2 id="friction-heading" className="font-display text-xl font-semibold">
            Friction signals
          </h2>
          <Table
            caption="Friction"
            head={["Signal", "Page", "Target", "Count"]}
            rows={data.frictions.map((f) => [
              f.kind === "rage_click" ? "Rage click" : f.kind === "dead_click" ? "Dead click" : "Script error",
              f.page,
              f.target,
              String(f.count),
            ])}
            empty="No rage clicks, dead clicks or errors recorded."
          />
        </section>
        <section aria-labelledby="search-heading" className={panel}>
          <h2 id="search-heading" className="font-display text-xl font-semibold">
            Site search
          </h2>
          <Table
            caption="Searches"
            head={["Query", "Searches", "No results"]}
            rows={data.searches.map((s) => [s.query, String(s.count), s.zeroResults > 0 ? `${String(s.zeroResults)} ⚠` : "0"])}
            empty="No searches recorded."
          />
        </section>
        <section aria-labelledby="clicks-heading" className={panel}>
          <h2 id="clicks-heading" className="font-display text-xl font-semibold">
            Most clicked
          </h2>
          <Table caption="Clicks" head={["Page", "Element", "Clicks"]} rows={data.topClicks.map((c) => [c.page, c.target, String(c.count)])} />
        </section>
        <section aria-labelledby="entry-heading" className={panel}>
          <h2 id="entry-heading" className="font-display text-xl font-semibold">
            Entry, exit &amp; devices
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Table caption="Entry pages" head={["Entry page", "Sessions"]} rows={data.entryPages.map((e) => [e.page, String(e.count)])} />
            <Table caption="Exit pages" head={["Exit page", "Sessions"]} rows={data.exitPages.map((e) => [e.page, String(e.count)])} />
          </div>
          <Table
            caption="Devices"
            head={["Device", "Sessions", "Conversion"]}
            rows={data.devices.map((d) => [d.device, String(d.sessions), `${String(d.conversionRate)}%`])}
          />
        </section>
      </div>
      <p className="text-xs text-muted">
        Generated {new Date(data.generatedAt).toLocaleString("en-US")} · {data.includesDemo ? "includes" : "excludes"} seeded demo
        traffic · only visitors who accepted analytics cookies are counted.
      </p>
    </>
  );
}

/** Single-series column chart with a hover tooltip and a text alternative. */
function DailyChart({ daily }: { daily: Insights["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.sessions));
  const W = 560;
  const H = 180;
  const gap = 2;
  const bw = W / daily.length - gap;
  const active = hover === null ? null : daily[hover];
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        <svg viewBox={`0 0 ${String(W)} ${String(H + 20)}`} className="w-full" role="img" aria-label="Sessions per day, column chart">
          {[0.5, 1].map((f) => (
            <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--color-line)" strokeWidth="1" />
          ))}
          <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-line-strong)" strokeWidth="1" />
          {daily.map((d, i) => {
            const h = (d.sessions / max) * (H - 8);
            const x = i * (bw + gap);
            return (
              <g key={d.date} onMouseEnter={() => { setHover(i); }} onMouseLeave={() => { setHover(null); }}>
                <rect x={x} y={0} width={bw + gap} height={H} fill="transparent" />
                <path
                  d={`M${String(x)} ${String(H)} v${String(-Math.max(h - 4, 0))} q0 -4 4 -4 h${String(Math.max(bw - 8, 0))} q4 0 4 4 v${String(Math.max(h - 4, 0))} z`}
                  fill="var(--color-brand)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              </g>
            );
          })}
          <text x="0" y={H + 16} fontSize="11" fill="var(--color-muted)">
            {daily[0]?.date.slice(5)}
          </text>
          <text x={W} y={H + 16} fontSize="11" fill="var(--color-muted)" textAnchor="end">
            {daily.at(-1)?.date.slice(5)}
          </text>
          <text x="2" y="12" fontSize="11" fill="var(--color-muted)">
            {max}
          </text>
        </svg>
        {active ? (
          <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-card">
            <p className="font-semibold">{active.date}</p>
            <p>{active.sessions} sessions</p>
            <p>{active.purchases} purchases</p>
          </div>
        ) : null}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <Table caption="Sessions per day" head={["Date", "Sessions", "Purchases"]} rows={daily.map((d) => [d.date, String(d.sessions), String(d.purchases)])} />
      </details>
    </figure>
  );
}

function Funnel({ funnel }: { funnel: Insights["funnel"] }) {
  const top = Math.max(1, funnel[0]?.sessions ?? 1);
  return (
    <ol className="flex flex-col gap-3">
      {funnel.map((step, i) => (
        <li key={step.step} className="flex flex-col gap-1 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">
              {i + 1}. {step.step}
            </span>
            <span>
              <span className="font-semibold">{step.sessions.toLocaleString("en-US")}</span>
              {i > 0 ? <span className="ml-2 text-muted">−{step.dropOff}% from previous</span> : null}
            </span>
          </div>
          <div className="h-3 rounded-full bg-band" aria-hidden="true">
            <div className="h-3 rounded-full bg-brand" style={{ width: `${String(Math.max(1, (step.sessions / top) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Table({ caption, head, rows, bar, empty = "No data in this range." }: { caption: string; head: string[]; rows: string[][]; bar?: number[]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...(bar ?? [1]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-2 pr-3 font-medium ${i === head.length - 1 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={`${row.join("|")}-${String(r)}`} className="border-b border-line/60 last:border-0">
              {row.map((cell, c) => (
                <td key={c} className={`py-2 pr-3 ${c === row.length - 1 ? "text-right font-semibold tabular-nums" : "font-mono text-xs"}`}>
                  {c === row.length - 1 && bar ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2 rounded-full bg-brand/70" style={{ width: `${String(((bar[r] ?? 0) / max) * 80)}px` }} />
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
