import { NextResponse } from "next/server";
import { ScenarioPatchSchema } from "@/lib/api/dev-schemas";
import { SCENARIO_COOKIE, serializeScenario, type Scenario } from "@/lib/dev/scenario-defs";
import { MockApiError, mockHandler, readBody } from "@/mock-server/http";

export const POST = mockHandler(
  async (request, { scenario }) => {
    const parsed = ScenarioPatchSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new MockApiError("validation_failed", "Unknown scenario flag or value.");
    const next = "clear" in parsed.data ? "" : serializeScenario({ ...scenario, ...parsed.data } as Scenario);
    const response = NextResponse.json({ ok: true });
    // Not httpOnly: Playwright and testers may set it directly (spec §7.1).
    response.cookies.set(SCENARIO_COOKIE, next, { path: "/", sameSite: "lax" });
    return response;
  },
  { dev: true },
);
