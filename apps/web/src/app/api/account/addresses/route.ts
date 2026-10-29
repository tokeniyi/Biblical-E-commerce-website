import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { addAddress, addressBook } from "@/mock-server/services/account";

export const GET = mockHandler((request, ctx) => {
  const { user } = accountRequest(request, ctx);
  return NextResponse.json(addressBook(user));
});

/** A09 new address: same validation as O03 (E07). */
export const POST = mockHandler(async (request, ctx) => {
  const { db, user } = accountRequest(request, ctx);
  addAddress(db, user, await readBody(request));
  return NextResponse.json(addressBook(user));
});
