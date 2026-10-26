// Contracts for /api/__dev/* (mock-only; deleted with the mock server).
import { z } from "zod";
import { IDENTITY_OPTIONS, SCENARIO_DEFS, SCENARIO_KEYS } from "@/lib/dev/scenario-defs";

const identityValues = IDENTITY_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const DevStateSchema = z.object({
  identity: z.enum(identityValues),
  sessionExpired: z.boolean(),
  scenario: z.record(z.string(), z.string()),
  now: z.string().datetime(),
  outboxCount: z.number().int().nonnegative(),
  pendingReviews: z.number().int().nonnegative(),
});
export type DevState = z.infer<typeof DevStateSchema>;

export const OutboxMessageSchema = z.object({
  id: z.string(),
  kind: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  code: z.string().nullable(),
  sentAt: z.string().datetime(),
});
export const InboxSchema = z.object({ messages: z.array(OutboxMessageSchema) });
export type InboxMessage = z.infer<typeof OutboxMessageSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });
export const ApprovedSchema = z.object({ approved: z.number().int().nonnegative() });

/** Body of POST /api/__dev/scenario: any subset of flags, or { clear: true }. */
export const ScenarioPatchSchema = z.union([
  z.object({ clear: z.literal(true) }),
  z
    .object(
      Object.fromEntries(
        SCENARIO_KEYS.map((key) => [
          key,
          z.enum(SCENARIO_DEFS[key].options as unknown as [string, ...string[]]).optional(),
        ]),
      ),
    )
    .strict(),
]);

export const IdentityPatchSchema = z.object({ identity: z.enum(identityValues) });
