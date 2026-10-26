// DELETE-ME-LATER: in-memory database, kept on globalThis so it survives
// hot reloads in `next dev`. POST /api/__dev/reset reseeds it.
import { createSeed } from "./seed";
import type { Db } from "./types";

const globalForStore = globalThis as typeof globalThis & { __bibleStoreMockDb?: Db };

/**
 * Collections the current code expects. Recomputed whenever HMR re-evaluates
 * this module, so a store created by older code (missing a collection added
 * since) is detected and reseeded instead of crashing handlers.
 */
const EXPECTED_KEYS = Object.keys(createSeed());

export function isCurrentShape(db: object): boolean {
  return EXPECTED_KEYS.every((key) => key in db);
}

export function getDb(): Db {
  const existing = globalForStore.__bibleStoreMockDb;
  if (existing && isCurrentShape(existing)) return existing;
  if (existing) console.warn("[mock-server] store shape changed after hot reload; reseeding");
  globalForStore.__bibleStoreMockDb = createSeed();
  return globalForStore.__bibleStoreMockDb;
}

export function resetDb(): Db {
  globalForStore.__bibleStoreMockDb = createSeed();
  return globalForStore.__bibleStoreMockDb;
}

export function nextId(db: Db, prefix: string): string {
  db.seq += 1;
  return `${prefix}_${String(db.seq)}`;
}
