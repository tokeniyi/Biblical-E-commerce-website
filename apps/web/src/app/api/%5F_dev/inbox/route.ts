import { NextResponse } from "next/server";
import { mockHandler } from "@/mock-server/http";
import { listOutbox } from "@/mock-server/outbox";
import { getDb } from "@/mock-server/store";

export const GET = mockHandler(
  () => NextResponse.json({ messages: listOutbox(getDb()) }),
  { dev: true },
);
