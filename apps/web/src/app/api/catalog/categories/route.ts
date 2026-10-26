import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { categoryDirectory } from "@/mock-server/services/catalog";
import { getDb } from "@/mock-server/store";

/** C02 category directory with server counts. */
export const GET = mockHandler(() => NextResponse.json(categoryDirectory(getDb())));
