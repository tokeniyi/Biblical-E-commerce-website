import { NextResponse } from "next/server";
import { mockHandler, readBody } from "@/mock-server/http";
import { accountRequest } from "@/mock-server/request";
import { addressBook, deleteAddress, findAddress, updateAddress } from "@/mock-server/services/account";

/** Only the customer's own addresses; any other id is not_found. */
export const GET = mockHandler((request, ctx, { id = "" }) => {
  const { user } = accountRequest(request, ctx);
  return NextResponse.json(findAddress(user, id));
});

export const PUT = mockHandler(async (request, ctx, { id = "" }) => {
  const { user } = accountRequest(request, ctx);
  updateAddress(user, id, await readBody(request));
  return NextResponse.json(addressBook(user));
});

/** After the delete confirmation; existing orders keep their own address. */
export const DELETE = mockHandler((request, ctx, { id = "" }) => {
  const { user } = accountRequest(request, ctx);
  deleteAddress(user, id);
  return NextResponse.json(addressBook(user));
});
