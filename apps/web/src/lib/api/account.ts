import { notFound, redirect } from "next/navigation";
import { loginPath, type Session } from "@your-app/shared";
import { ApiError } from "./client";
import { serverApi } from "./server";

export type CustomerSession = Extract<Session, { kind: "customer" }>;

/**
 * Account pages (A07–A13) need a customer session. Signed out (or staff)
 * goes to A14 "auth required", an expired session to A14 "session expired",
 * both keeping this page as the safe returnTo. The API re-checks on every call.
 */
export async function requireCustomerPage(returnTo: string): Promise<CustomerSession> {
  const { session, expired } = await (await serverApi()).getSession();
  if (session.kind === "customer") return session;
  redirect(loginPath(returnTo, expired ? "session-expired" : "auth-required"));
}

/**
 * Reads account data for a Server Component. The session can expire
 * between the guard and the read: that is E11 too. Not found (including
 * someone else's order) is the 404 page; an outage is null (E18).
 */
export async function loadAccountData<T>(returnTo: string, read: (api: Awaited<ReturnType<typeof serverApi>>) => Promise<T>): Promise<T | null> {
  try {
    return await read(await serverApi());
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.code === "session_expired") redirect(loginPath(returnTo, "session-expired"));
    if (error.code === "unauthenticated") redirect(loginPath(returnTo, "auth-required"));
    if (error.code === "not_found") notFound();
    if (error.code === "network_error") return null;
    throw error;
  }
}
