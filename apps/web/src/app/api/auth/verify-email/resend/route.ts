import { NextResponse } from "next/server";
import { ResendVerificationInputSchema } from "@your-app/shared";
import { mockHandler, readBody } from "@/mock-server/http";
import { authRequest } from "@/mock-server/request";
import { PENDING_VERIFICATION_COOKIE, viewerOf } from "@/mock-server/services/auth";
import { resendVerification } from "@/mock-server/services/identity";

/** A03 "Resend email" / "Send a new link": generic answer with the 60 s cooldown. */
export const POST = mockHandler(async (request, ctx) => {
  const parsed = ResendVerificationInputSchema.safeParse(await readBody(request));
  const { db, auth } = authRequest(request, ctx);
  const viewer = viewerOf(db, request, auth.at);
  const userId = viewer.status === "active" && viewer.session.kind === "customer" ? viewer.session.userId : undefined;
  const raw = request.cookies.get(PENDING_VERIFICATION_COOKIE)?.value;
  const token = parsed.success ? parsed.data.token : undefined;
  return NextResponse.json(
    resendVerification(
      db,
      // An old link names its account; otherwise the session, then this browser's sign-up email.
      token ? { token } : { userId, email: raw ? decodeURIComponent(raw) : undefined },
      auth,
    ),
  );
});
