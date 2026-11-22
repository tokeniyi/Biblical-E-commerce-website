import { NextResponse } from "next/server";
import { AnalyticsBatchSchema } from "@your-app/shared";
import { CONSENT_COOKIE, VISITOR_COOKIE, analyticsAllowed } from "@/lib/analytics/consent";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";
import { ingestBatch } from "@/mock-server/services/analytics";
import { getDb } from "@/mock-server/store";

/**
 * Consented UX analytics ingest. Refuses without the consent cookie, and the
 * batch must carry the visitor id from the first-party cookie. Exempt from
 * injected latency/faults so dev scenarios don't drop analytics.
 */
export const POST = mockHandler(
  async (request) => {
    const parsed = AnalyticsBatchSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new MockApiError("validation_failed", "Invalid analytics batch.");
    const accepted = ingestBatch(getDb(), parsed.data, {
      consentGranted: analyticsAllowed(request.cookies.get(CONSENT_COOKIE)?.value),
      cookieVisitorId: request.cookies.get(VISITOR_COOKIE)?.value,
      receivedAt: Date.now(),
    });
    return NextResponse.json({ accepted });
  },
  { chrome: true },
);
