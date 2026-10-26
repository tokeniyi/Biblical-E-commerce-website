"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { ApiError, api } from "@/lib/api/client";
import type { DevState } from "@/lib/api/dev-schemas";
import {
  DEFAULT_SCENARIO,
  IDENTITY_OPTIONS,
  SCENARIO_DEFS,
  SCENARIO_KEYS,
  isIdentityOption,
  type ScenarioKey,
} from "@/lib/dev/scenario-defs";

const DEV_LINKS = [
  { href: "/__dev/screens", label: "Screens" },
  { href: "/__dev/states", label: "States" },
  { href: "/__dev/inbox", label: "Inbox" },
] as const;

function describeError(error: unknown): string {
  return error instanceof ApiError ? `${error.code}: ${error.message}` : "Unexpected error";
}

/** Floating mock-server controls (spec §7.1). Only mounted when mock tools are on. */
export function DevToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DevState | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await api.dev.getState());
    } catch (error) {
      setStatus(`Could not load dev state (${describeError(error)})`);
    }
  }, []);

  // Reload on navigation: one-shot flags may have been consumed by the page.
  useEffect(() => {
    void load();
  }, [load, pathname]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setStatus("");
    try {
      await action();
      setStatus(done);
      await load();
      router.refresh();
    } catch (error) {
      setStatus(`Failed: ${describeError(error)}`);
    } finally {
      setBusy(false);
    }
  }

  const active = state
    ? SCENARIO_KEYS.filter((key) => state.scenario[key] !== DEFAULT_SCENARIO[key])
    : [];

  return (
    <div className="fixed bottom-3 right-3 z-50 flex max-h-[calc(100vh-1.5rem)] w-[320px] flex-col items-end gap-2 text-xs">
      <section
          id={panelId}
          aria-label="Dev tools"
          hidden={!open}
          className="w-full flex-col gap-3 overflow-y-auto border border-ink bg-white p-3 shadow-lg [&:not([hidden])]:flex"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Dev tools (mock server)</h2>
            {state ? <span className="font-mono">{new Date(state.now).toISOString().slice(0, 16)}Z</span> : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${panelId}-identity`} className="font-semibold">
              Identity
            </label>
            <select
              id={`${panelId}-identity`}
              className="border border-line p-1"
              value={state?.identity ?? "signed-out"}
              disabled={busy || !state}
              onChange={(event) => {
                const identity = event.target.value;
                if (isIdentityOption(identity)) {
                  void run(() => api.dev.setIdentity(identity), `Identity set: ${identity}`);
                }
              }}
            >
              {IDENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {state?.sessionExpired ? <span>Session: expired</span> : null}
          </div>

          {SCENARIO_KEYS.map((key: ScenarioKey) => {
            const def = SCENARIO_DEFS[key];
            const id = `${panelId}-${key}`;
            return (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={id} className="font-semibold">
                  {def.label}
                  {def.oneShot ? " (one-shot)" : ""}
                </label>
                <select
                  id={id}
                  className="border border-line p-1"
                  value={state?.scenario[key] ?? DEFAULT_SCENARIO[key]}
                  disabled={busy || !state}
                  onChange={(event) =>
                    void run(
                      () => api.dev.setScenario({ [key]: event.target.value }),
                      `${def.label}: ${event.target.value}`,
                    )
                  }
                >
                  {def.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="border border-ink px-2 py-1" disabled={busy}
              onClick={() => void run(() => api.dev.expireSession(), "Session expired")}>
              Expire session now
            </button>
            <button type="button" className="border border-ink px-2 py-1" disabled={busy}
              onClick={() => void run(() => api.dev.approveReviews(), "Pending reviews approved")}>
              Approve pending reviews{state ? ` (${String(state.pendingReviews)})` : ""}
            </button>
            <button type="button" className="border border-ink px-2 py-1" disabled={busy}
              onClick={() => void run(() => api.dev.loadSampleCart(), "Sample cart loaded (C07/C08)")}>
              Load sample cart
            </button>
            <button type="button" className="border border-ink px-2 py-1" disabled={busy}
              onClick={() => void run(() => api.dev.setScenario({ clear: true }), "Scenario cleared")}>
              Clear scenario
            </button>
            <button type="button" className="border border-danger px-2 py-1 text-danger" disabled={busy}
              onClick={() => void run(() => api.dev.reset(), "Store reset and reseeded")}>
              Reset store
            </button>
          </div>

          <nav aria-label="Dev pages">
            <ul className="flex gap-3">
              {DEV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="underline">
                    {link.label}
                    {link.href === "/__dev/inbox" && state ? ` (${String(state.outboxCount)})` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

      <p role="status" aria-live="polite" className={status ? "bg-white px-2 py-1 shadow" : "sr-only"}>
        {status}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-1">
        {active.map((key) => (
          <span key={key} data-testid="active-flag" className="border border-ink bg-white px-1.5 py-0.5 font-mono">
            {key}:{state?.scenario[key]}
          </span>
        ))}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((value) => !value);
          }}
          className="border border-ink bg-ink px-3 py-1.5 font-semibold text-white"
        >
          Dev tools{active.length > 0 ? ` · ${String(active.length)} active` : ""}
        </button>
      </div>
    </div>
  );
}
