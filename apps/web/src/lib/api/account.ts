import { redirect } from "next/navigation";
import { ApiError } from "./client";
import { serverApi } from "./server";

/**
 * Account pages: the signed-in customer, or a redirect to A01 with a safe
 * returnTo (A14). Expired sessions say so. Every API call re-checks anyway.
 */
export async function requireCustomerPage(returnTo: string) {
  const api = await serverApi();
  const { session, expired } = await api.getSession();
  if (session.kind !== "customer") {
    const reason = expired ? "session-expired" : "required";
    redirect(`/login?reason=${reason}&returnTo=${encodeURIComponent(returnTo)}`);
  }
  return { api, session };
}

/** Maps auth failures on account reads to the sign-in redirect. */
export function authRedirectOn(error: unknown, returnTo: string): void {
  if (error instanceof ApiError && (error.code === "unauthenticated" || error.code === "session_expired")) {
    redirect(`/login?reason=session-expired&returnTo=${encodeURIComponent(returnTo)}`);
  }
}
