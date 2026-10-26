// DELETE-ME-LATER: in-memory database, kept on globalThis so it survives
// hot reloads in `next dev`. POST /api/__dev/reset reseeds it.
import { createSeed } from "./seed";
import type { Db } from "./types";

const globalForStore = globalThis as typeof globalThis & { __bibleStoreMockDb?: Db };

export function getDb(): Db {
  globalForStore.__bibleStoreMockDb ??= createSeed();
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
