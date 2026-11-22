/**
 * Cookie consent for first-party UX analytics. Pure helpers shared by the
 * browser (banner, tracker) and the server (ingest refuses without consent).
 */

export const CONSENT_COOKIE = "bs_consent";
export const VISITOR_COOKIE = "_bs_vid";
export const SESSION_COOKIE_ANALYTICS = "_bs_sid";

/** Bump when the categories or their meaning change: visitors are asked again. */
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 180;
export const VISITOR_MAX_AGE_DAYS = 180;
/** A session ends after 30 minutes without activity. */
export const SESSION_IDLE_MINUTES = 30;

export type ConsentChoice = "granted" | "denied";
export type ConsentState = { version: number; analytics: ConsentChoice; decidedAt: number };

export function serializeConsent(state: ConsentState): string {
  return `v${String(state.version)}.analytics-${state.analytics}.${String(state.decidedAt)}`;
}

/** Null for a missing, malformed or outdated cookie: ask again. */
export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  const match = /^v(\d+)\.analytics-(granted|denied)\.(\d+)$/.exec(decodeURIComponent(raw));
  if (!match) return null;
  const version = Number(match[1]);
  if (version !== CONSENT_VERSION) return null;
  return { version, analytics: match[2] as ConsentChoice, decidedAt: Number(match[3]) };
}

export function analyticsAllowed(raw: string | undefined | null): boolean {
  return parseConsent(raw)?.analytics === "granted";
}
