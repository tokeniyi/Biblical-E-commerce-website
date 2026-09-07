import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Locally: Docker Postgres has no pooler, so this is the same value as
    // DATABASE_URL. Against Neon: this must be the UNPOOLED connection
    // string (what used to be DIRECT_URL) — Prisma CLI/migrations need a
    // direct connection, not the pgbouncer-pooled one.
    url: env("DIRECT_URL"),
  },
});
