import { NextResponse } from "next/server";
import { parseListingQuery } from "@your-app/shared";
import { mockHandler } from "@/mock-server/http";
import { listProducts } from "@/mock-server/services/catalog";
import { getDb } from "@/mock-server/store";

/**
 * C03 / C04 listing. `category` selects a C03 category; without it this is
 * search (C04) across all Bibles. Every other param is the page URL's query.
 */
export const GET = mockHandler((request) => {
  const params = request.nextUrl.searchParams;
  const category = params.get("category");
  return NextResponse.json(listProducts(getDb(), category, parseListingQuery(params)));
});
