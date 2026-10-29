import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { profileOf, updateProfile } from "@/mock-server/services/account";

export const GET = mockHandler((request, ctx) => {
  const { user } = accountRequest(request, ctx);
  return NextResponse.json(profileOf(user));
});

/** A08 save; a changed email is sent a verification link (A03). */
export const PATCH = mockHandler(async (request, ctx) => {
  const { db, at, user } = accountRequest(request, ctx);
  return NextResponse.json(updateProfile(db, user, await readBody(request), at));
});
