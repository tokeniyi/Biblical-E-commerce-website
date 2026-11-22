/**
 * Browser-side UX analytics queue. Does nothing until enabled by the consent
 * flow (components/analytics/AnalyticsProvider). Events are batched and sent
 * with fetch(keepalive) or sendBeacon when the page is hidden.
 */
import {
  ANALYTICS_MAX_BATCH,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type AnalyticsProps,
  type DeviceClass,
} from "@your-app/shared";
import { SESSION_COOKIE_ANALYTICS, SESSION_IDLE_MINUTES, VISITOR_COOKIE, VISITOR_MAX_AGE_DAYS } from "./consent";
import { sanitizePath } from "./sanitize";

export const INGEST_URL = "/api/analytics/events";
const FLUSH_INTERVAL_MS = 4000;

type TrackerState = {
  enabled: boolean;
  queue: AnalyticsEvent[];
  timer: ReturnType<typeof setTimeout> | null;
};

const state: TrackerState = { enabled: false, queue: [], timer: null };

// ---- cookies --------------------------------------------------------------

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return undefined;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${String(maxAgeSeconds)}; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Visitor id: created on first consented visit, kept for 180 days. */
export function ensureVisitorId(): string {
  const existing = readCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const id = randomId();
  writeCookie(VISITOR_COOKIE, id, VISITOR_MAX_AGE_DAYS * 86_400);
  return id;
}

/** Session id: rolls over after 30 idle minutes (the cookie's max-age is refreshed on activity). */
export function touchSessionId(): string {
  const id = readCookie(SESSION_COOKIE_ANALYTICS) ?? randomId();
  writeCookie(SESSION_COOKIE_ANALYTICS, id, SESSION_IDLE_MINUTES * 60);
  return id;
}

export function deviceClass(width: number): DeviceClass {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

// ---- queue ------------------------------------------------------------------

export function setTrackingEnabled(enabled: boolean): void {
  state.enabled = enabled;
  if (!enabled) {
    state.queue = [];
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
  }
}

export function isTrackingEnabled(): boolean {
  return state.enabled;
}

function currentPath(): string {
  return sanitizePath(`${location.pathname}${location.search}`);
}

/** Records an event if (and only if) the visitor has granted analytics consent. */
export function track(type: AnalyticsEventType, props: AnalyticsProps = {}, path?: string): void {
  if (!state.enabled || typeof window === "undefined") return;
  state.queue.push({ type, props, path: sanitizePath(path ?? currentPath()), at: Date.now() });
  if (state.queue.length >= 20) {
    flush();
  } else if (!state.timer) {
    state.timer = setTimeout(() => flush(), FLUSH_INTERVAL_MS);
  }
}

/** Sends queued events. `beacon` is used while the page is being hidden/unloaded. */
export function flush(beacon = false): void {
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
  if (!state.enabled || state.queue.length === 0) return;
  const visitorId = ensureVisitorId();
  const sessionId = touchSessionId();
  const device = deviceClass(window.innerWidth);
  while (state.queue.length > 0) {
    const events = state.queue.splice(0, ANALYTICS_MAX_BATCH);
    const body = JSON.stringify({ visitorId, sessionId, device, events });
    if (beacon && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(INGEST_URL, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(INGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => undefined);
    }
  }
}

/** For tests and the E2E suite: what is waiting to be sent. */
export function pendingEvents(): readonly AnalyticsEvent[] {
  return state.queue;
}
