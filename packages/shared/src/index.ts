/**
 * Shared contract between apps/web (Next.js) and apps/api (NestJS).
 * Both apps import from "@your-app/shared" instead of redefining these
 * shapes independently.
 */

export * from "./schemas";