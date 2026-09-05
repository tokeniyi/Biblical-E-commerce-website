/**
 * Shared contract between apps/web (Next.js) and apps/api (NestJS).
 *
 * Put here:
 *  - Zod schemas for request/response payloads (payments, auth, content)
 *  - Types generated from your Prisma schema that the frontend needs
 *    (re-export narrowed types, not full Prisma models, to avoid leaking
 *    DB-only fields to the client)
 *
 * Both apps/web and apps/api should import from "@your-app/shared"
 * instead of redefining these shapes independently.
 */

export {};
