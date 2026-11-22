"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, Suspense, type ReactNode } from "react";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
  SESSION_COOKIE_ANALYTICS,
  VISITOR_COOKIE,
  parseConsent,
  serializeConsent,
  type ConsentChoice,
} from "@/lib/analytics/consent";
import { deadClickTarget, describeTarget, interactiveAncestor, isRageClick, scrollPercent, type ClickSample } from "@/lib/analytics/dom";
import { sanitizePath } from "@/lib/analytics/sanitize";
import { deleteCookie, ensureVisitorId, flush, readCookie, setTrackingEnabled, touchSessionId, track, writeCookie } from "@/lib/analytics/tracker";
import { ConsentBanner } from "./ConsentBanner";

export const OPEN_CONSENT_EVENT = "bs:open-consent";

type ConsentContextValue = {
  /** null until the visitor decides (or before hydration). */
  choice: ConsentChoice | null;
  decide: (choice: ConsentChoice) => void;
  openSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used inside AnalyticsProvider");
  return ctx;
}

function globalPrivacyControl(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || navigator.doNotTrack === "1";
}

/**
 * Consent + navigation tracking. Nothing is recorded and no analytics cookie
 * is set until the visitor accepts. Global Privacy Control / Do Not Track
 * count as "not yet" (no banner pops up; Cookie settings can still opt in).
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    const stored = parseConsent(readCookie(CONSENT_COOKIE));
    if (stored) {
      setChoice(stored.analytics);
      if (stored.analytics === "granted") {
        ensureVisitorId();
        touchSessionId();
        setTrackingEnabled(true);
      }
    } else if (!globalPrivacyControl()) {
      setBannerOpen(true);
    }
    const open = () => { setBannerOpen(true); };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => { window.removeEventListener(OPEN_CONSENT_EVENT, open); };
  }, []);

  const decide = useCallback(
    (next: ConsentChoice) => {
      const previous = choice;
      writeCookie(
        CONSENT_COOKIE,
        serializeConsent({ version: CONSENT_VERSION, analytics: next, decidedAt: Date.now() }),
        CONSENT_MAX_AGE_DAYS * 86_400,
      );
      setChoice(next);
      setBannerOpen(false);
      if (next === "granted") {
        ensureVisitorId();
        touchSessionId();
        // NavigationTracker records the current page once tracking is on.
        setTrackingEnabled(true);
      } else {
        setTrackingEnabled(false);
        if (previous === "granted" || readCookie(VISITOR_COOKIE)) {
          // Withdrawal also erases what was collected for this browser.
          void fetch("/api/analytics/me", { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
        }
        deleteCookie(VISITOR_COOKIE);
        deleteCookie(SESSION_COOKIE_ANALYTICS);
      }
    },
    [choice],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({ choice, decide, openSettings: () => { setBannerOpen(true); } }),
    [choice, decide],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <NavigationTracker enabled={choice === "granted"} />
      </Suspense>
      {bannerOpen ? <ConsentBanner choice={choice} onDecide={decide} onClose={() => { setBannerOpen(false); }} /> : null}
    </ConsentContext.Provider>
  );
}

/**
 * Page views (with time on page and scroll depth), clicks, rage clicks,
 * dead clicks and script errors. Reads the URL, so it sits in a Suspense
 * boundary inside AnalyticsProvider's subtree.
 */
function NavigationTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = useRef<{ path: string; startedAt: number; maxScroll: number; left: boolean } | null>(null);
  const previousPath = useRef<string>("");
  const clicks = useRef<ClickSample[]>([]);

  const leavePage = useCallback(() => {
    const current = page.current;
    if (!current || current.left) return;
    current.left = true;
    track("page_leave", { dwellMs: Date.now() - current.startedAt, scroll: current.maxScroll }, current.path);
  }, []);

  // Page view on every route change (including query changes such as filters).
  useEffect(() => {
    if (!enabled) return;
    const query = searchParams.toString();
    const path = sanitizePath(query ? `${pathname}?${query}` : pathname);
    if (page.current?.path === path) return;
    leavePage();
    track("page_view", { title: document.title.slice(0, 120), referrer: previousPath.current }, path);
    previousPath.current = path;
    page.current = { path, startedAt: Date.now(), maxScroll: scrollPercent(), left: false };
  }, [enabled, pathname, searchParams, leavePage]);

  useEffect(() => {
    if (!enabled) {
      page.current = null;
      return;
    }
    const onScroll = () => {
      if (page.current) page.current.maxScroll = Math.max(page.current.maxScroll, scrollPercent());
    };
    const onClick = (event: MouseEvent) => {
      const sample = { x: event.clientX, y: event.clientY, at: Date.now() };
      const el = interactiveAncestor(event.target);
      const label = el ? describeTarget(el) : deadClickTarget(event.target);
      if (isRageClick(clicks.current, sample)) {
        track("rage_click", { target: label ?? "page" });
        clicks.current = [];
      } else {
        clicks.current = [...clicks.current.filter((c) => sample.at - c.at < 1000), sample];
      }
      if (el && label) {
        const href = el instanceof HTMLAnchorElement ? sanitizePath(el.getAttribute("href") ?? "") : null;
        track("click", href ? { target: label, href } : { target: label });
      } else if (label) {
        track("dead_click", { target: label });
      }
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        leavePage();
        flush(true);
      } else if (page.current?.left) {
        // Back to the tab: keep measuring the same page without a new view.
        page.current = { ...page.current, startedAt: Date.now(), left: false };
      }
    };
    const onError = (event: ErrorEvent) => {
      track("js_error", { message: event.message.slice(0, 120) });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("error", onError);
    };
  }, [enabled, leavePage]);

  return null;
}
