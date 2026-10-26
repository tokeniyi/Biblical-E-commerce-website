import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { approvePendingReviews } from "@/mock-server/services/dev";
import { getDb } from "@/mock-server/store";

export const POST = mockHandler(
  () => NextResponse.json({ approved: approvePendingReviews(getDb()) }),
  { dev: true },
);
