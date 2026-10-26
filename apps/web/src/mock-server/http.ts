// DELETE-ME-LATER: glue between Next route handlers and mock services.
import { NextResponse, type NextRequest } from "next/server";
import type { ApiErrorCode, ErrorEnvelope } from "@your-app/shared";
import { NETWORK_FAILURE_HEADER } from "@/lib/api/client";
import { mockToolsEnabled } from "@/lib/dev/mock-tools";
import { SCENARIO_COOKIE } from "@/lib/dev/scenario-defs";
import { ScenarioContext, readScenario } from "./scenarios";

const STATUS_BY_CODE: Partial<Record<ApiErrorCode, number>> = {
  validation_failed: 422,
  not_found: 404,
  unauthenticated: 401,
  session_expired: 401,
  forbidden: 403,
  invalid_credentials: 401,
  rate_limited: 429,
  version_conflict: 409,
  quote_changed: 409,
  internal: 500,
};

export class MockApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function errorResponse(error: MockApiError): NextResponse<ErrorEnvelope> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        ...(error.details ? { details: error.details } : {}),
      },
    },
    { status: STATUS_BY_CODE[error.code] ?? 400 },
  );
}

type HandlerOptions = {
  /**
   * Dev endpoints 404 when mock tools are off, and skip latency and network
   * faults so the toolbar always works.
   */
  dev?: boolean;
};

export function readBody(request: NextRequest): Promise<unknown> {
  return request.json().catch(() => {
    throw new MockApiError("validation_failed", "Request body must be JSON.");
  });
}

type Handler = (request: NextRequest, ctx: ScenarioContext) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a route handler with scenario behavior: simulated latency, one-shot
 * network faults, the error envelope, and clearing consumed one-shot flags.
 */
export function mockHandler(handler: Handler, options: HandlerOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse> => {
    if (options.dev && !mockToolsEnabled()) {
      return errorResponse(new MockApiError("not_found", "Not found."));
    }
    const ctx = new ScenarioContext(readScenario(request));
    const { scenario } = ctx;
    let response: NextResponse;

    if (!options.dev && scenario.latency !== "0") {
      await new Promise((resolve) => setTimeout(resolve, Number(scenario.latency)));
    }

    const isRead = request.method === "GET" || request.method === "HEAD";
    const failRead = scenario.network === "fail-read" && isRead;
    const failWrite = scenario.network === "fail-write" && !isRead;

    if (!options.dev && (failRead || failWrite)) {
      ctx.consume("network");
      response = new NextResponse(null, {
        status: 503,
        headers: { [NETWORK_FAILURE_HEADER]: "1" },
      });
    } else {
      try {
        response = await handler(request, ctx);
      } catch (error) {
        if (!(error instanceof MockApiError)) throw error;
        response = errorResponse(error);
      }
    }

    const nextCookie = ctx.nextCookieValue();
    if (nextCookie !== null) {
      response.cookies.set(SCENARIO_COOKIE, nextCookie, { path: "/", sameSite: "lax" });
    }
    return response;
  };
}
