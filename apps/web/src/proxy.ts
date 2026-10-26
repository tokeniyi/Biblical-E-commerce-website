import { NextResponse, type NextRequest } from "next/server";
import { mockToolsEnabled } from "@/lib/dev/mock-tools";
import { SCENARIO_COOKIE, mergeScenarioParam } from "@/lib/dev/scenario-defs";

/**
 * `?scenario=payment:declined` (or `?scenario=clear`) on any page: merge it
 * into the scenario cookie, then redirect to the same URL without the param
 * so the page renders with the new flags and the URL stays shareable.
 */
export function proxy(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("scenario");
  if (param === null || !mockToolsEnabled()) return NextResponse.next();

  const target = request.nextUrl.clone();
  target.searchParams.delete("scenario");
  const response = NextResponse.redirect(target);
  response.cookies.set(
    SCENARIO_COOKIE,
    mergeScenarioParam(request.cookies.get(SCENARIO_COOKIE)?.value, param),
    { path: "/", sameSite: "lax" },
  );
  return response;
}

export const config = {
  // Pages only: API calls, Next internals and static files never carry presets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
