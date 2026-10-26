import { NextResponse } from "next/server";
import { SCENARIO_COOKIE } from "@/lib/dev/scenario-defs";
import { mockHandler } from "@/mock-server/http";
import { CART_COOKIE, SESSION_COOKIE } from "@/mock-server/services/auth";
import { resetDb } from "@/mock-server/store";

/** Reseeds the store and clears this browser's session, cart and scenario. */
export const POST = mockHandler(
  () => {
    resetDb();
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(CART_COOKIE);
    response.cookies.delete(SCENARIO_COOKIE);
    return response;
  },
  { dev: true },
);
