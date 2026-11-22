import { NextResponse } from "next/server";
import { VISITOR_COOKIE } from "@/lib/analytics/consent";
import { mockHandler } from "@/mock-server/http";
import { eraseVisitor } from "@/mock-server/services/analytics";
import { getDb } from "@/mock-server/store";

/** Erase this browser's analytics history (called when consent is withdrawn). */
export const DELETE = mockHandler(
  (request) => {
    const erased = eraseVisitor(getDb(), request.cookies.get(VISITOR_COOKIE)?.value);
    const response = NextResponse.json({ erased });
    response.cookies.delete(VISITOR_COOKIE);
    response.cookies.delete("_bs_sid");
    return response;
  },
  { chrome: true },
);
