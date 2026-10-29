/**
 * Safe `returnTo` (spec §5.5, Figma A01): same-origin relative paths only.
 * Anything else (absolute URLs, protocol-relative `//host`, `/\host`,
 * `javascript:`, control characters) falls back to the account overview.
 */

export const DEFAULT_RETURN_TO = "/account";

/** Auth pages are never a destination: returning to them would loop. */
const AUTH_PATHS = ["/login", "/register", "/verify-email", "/password"];

const ORIGIN = "http://return-to.invalid";

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function safeReturnTo(raw: string | null | undefined, fallback: string = DEFAULT_RETURN_TO): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  // One leading slash, then not another slash or a backslash ("//evil", "/\evil").
  if (!/^\/(?![/\\])/.test(raw)) return fallback;
  // Backslashes, whitespace and control characters are how parsers get confused.
  if (/[\\\s]/.test(raw) || hasControlCharacter(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== ORIGIN) return fallback;
  if (AUTH_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** A14: where a guarded page sends a signed-out or expired visitor. */
export type LoginReason = "session-expired" | "auth-required" | "signed-out";

export function loginPath(returnTo: string, reason?: LoginReason): string {
  const params = new URLSearchParams({ returnTo });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}
