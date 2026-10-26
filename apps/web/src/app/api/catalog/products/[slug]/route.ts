import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { productDetail } from "@/mock-server/services/catalog";
import { getDb } from "@/mock-server/store";

/** C05. Unknown and draft products are the same 404 (E19). */
export const GET = mockHandler((_request, _ctx, { slug = "" }) => NextResponse.json(productDetail(getDb(), slug)));
