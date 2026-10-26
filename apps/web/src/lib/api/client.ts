/**
 * Typed HTTP client: the ONLY way UI code talks to the back end. Today it
 * hits the mock Route Handlers under /api; swapping to NestJS is a baseUrl
 * change (spec §10). Every response is validated against a Zod contract.
 */
import type { z } from "zod";
import {
  ErrorEnvelopeSchema,
  SessionResponseSchema,
  type ApiErrorCode,
} from "@your-app/shared";
import {
  ApprovedSchema,
  DevStateSchema,
  InboxSchema,
  OkSchema,
} from "./dev-schemas";
import type { IdentityOption, Scenario } from "@/lib/dev/scenario-defs";

/** Set by the mock server when a scenario simulates an outage (E18). */
export const NETWORK_FAILURE_HEADER = "x-mock-network-failure";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string[]>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiClientOptions = {
  baseUrl?: string;
  /** Extra headers, e.g. the forwarded cookie for server-side calls. */
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? "";
  const doFetch = options.fetch ?? fetch;

  async function request<S extends z.ZodTypeAny>(
    path: string,
    schema: S,
    { method = "GET", body }: RequestOptions = {},
  ): Promise<z.infer<S>> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...options.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new ApiError("network_error", "We couldn’t reach the store.", 0);
    }

    if (response.headers.get(NETWORK_FAILURE_HEADER) === "1") {
      throw new ApiError("network_error", "We couldn’t reach the store.", response.status);
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const envelope = ErrorEnvelopeSchema.safeParse(payload);
      if (envelope.success) {
        const { code, message, fieldErrors, details } = envelope.data.error;
        throw new ApiError(code, message, response.status, fieldErrors, details);
      }
      throw new ApiError("internal", "Something went wrong.", response.status);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError("internal", `Unexpected response from ${path}`, response.status);
    }
    return parsed.data as z.infer<S>;
  }

  return {
    request,

    getSession: () => request("/api/session", SessionResponseSchema),
    signOut: () => request("/api/session/logout", OkSchema, { method: "POST" }),

    dev: {
      getState: () => request("/api/__dev/state", DevStateSchema),
      setScenario: (patch: Partial<Scenario> | { clear: true }) =>
        request("/api/__dev/scenario", OkSchema, { method: "POST", body: patch }),
      setIdentity: (identity: IdentityOption) =>
        request("/api/__dev/identity", OkSchema, { method: "POST", body: { identity } }),
      expireSession: () => request("/api/__dev/session/expire", OkSchema, { method: "POST" }),
      reset: () => request("/api/__dev/reset", OkSchema, { method: "POST" }),
      approveReviews: () => request("/api/__dev/reviews/approve", ApprovedSchema, { method: "POST" }),
      getInbox: () => request("/api/__dev/inbox", InboxSchema),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Browser-side client (relative URLs, cookies sent automatically). */
export const api = createApiClient();
