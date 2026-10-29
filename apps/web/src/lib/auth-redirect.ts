import { loginPath } from "@your-app/shared";
import { ApiError } from "./api/client";

/**
 * Where a guarded mutation sends the customer when the API says the
 * session is gone: A14 (session expired, E11) or A01/A14 (signed out).
 * Null for any other error, which the form shows itself.
 */
export function signInRedirect(error: unknown, returnTo: string): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === "session_expired") return loginPath(returnTo, "session-expired");
  if (error.code === "unauthenticated") return loginPath(returnTo, "auth-required");
  return null;
}
