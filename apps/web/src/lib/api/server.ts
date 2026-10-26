import { headers } from "next/headers";
import { createApiClient } from "./client";

/**
 * Client for Server Components: same contract as the browser client, with
 * an absolute base URL and the incoming request's cookies forwarded.
 */
export async function serverApi() {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? "http";
  const baseUrl = process.env.API_BASE_URL ?? `${protocol}://${host}`;
  const cookie = incoming.get("cookie");
  return createApiClient({ baseUrl, headers: cookie ? { cookie } : {} });
}
