import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { API_BASE_URL, AUTH_SECRET } from "../config/env";

/**
 * Sends a server-side web request to the API with the Auth.js session token.
 * The token is forwarded unchanged so NestJS verifies the same JWT issued by
 * Auth.js rather than trusting the web session claims a second time.
 */
export async function authenticatedApiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const requestHeaders = await headers();
  const token = await getToken({
    req: { headers: requestHeaders },
    secret: AUTH_SECRET ?? "",
    raw: true,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const nextHeaders = new Headers(init.headers);
  if (token) nextHeaders.set("authorization", `Bearer ${token}`);

  return fetch(new URL(path, API_BASE_URL), {
    ...init,
    headers: nextHeaders,
  });
}
