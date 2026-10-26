import { z } from "zod";
import { STAFF_ROLES } from "../config/rules";

export const StaffRoleSchema = z.enum(STAFF_ROLES);

/**
 * What getSession() returns. Kept compatible with the Auth.js JWT plan
 * (docs/ARCHITECTURE.md §3.1): a subject id and email, plus a role claim.
 */
export const SessionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("anonymous") }),
  z.object({
    kind: z.literal("customer"),
    userId: z.string(),
    email: z.string().email(),
    name: z.string(),
    emailVerified: z.boolean(),
    expiresAt: z.string().datetime(),
  }),
  z.object({
    kind: z.literal("staff"),
    userId: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: StaffRoleSchema,
    expiresAt: z.string().datetime(),
  }),
]);
export type Session = z.infer<typeof SessionSchema>;

/** GET /api/session: who is signed in, plus the header cart count. */
export const SessionResponseSchema = z.object({
  session: SessionSchema,
  /** True when a session existed but has expired (E11 vs plain signed-out). */
  expired: z.boolean(),
  cartCount: z.number().int().nonnegative(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
