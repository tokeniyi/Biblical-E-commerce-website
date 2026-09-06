import { z } from "zod";

/**
 * Shape of the JWT issued by Auth.js (strategy: "jwt") and verified
 * independently by the NestJS guard using the shared AUTH_SECRET.
 *
 * Keep this in sync with Auth.js's jwt callback: if a claim is added on
 * the Next.js side, add it here too, or the NestJS guard will silently
 * ignore it.
 */
export const AuthJwtPayloadSchema = z.object({
  sub: z.string().uuid(), // user id
  email: z.string().email(),
  name: z.string().nullable().optional(),
  iat: z.number(), // issued-at (standard JWT claim)
  exp: z.number(), // expiry (standard JWT claim)
});

export type AuthJwtPayload = z.infer<typeof AuthJwtPayloadSchema>;