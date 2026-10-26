import { z } from "zod";

/**
 * Error codes map 1:1 to the wireframe edge states (E##) plus generic HTTP
 * failures, so the UI can pick the right recovery screen from the code alone.
 */
export const ApiErrorCodeSchema = z.enum([
  "validation_failed", // E07, E24 (field errors)
  "not_found", // E19 - also used for unauthorized order access (non-disclosing)
  "unauthenticated", // A14 signed-out / auth-required
  "session_expired", // E11
  "forbidden", // E20
  "invalid_credentials", // E09
  "token_expired", // E10, A03 expired link
  "guest_code_invalid", // E13
  "rate_limited",
  "quote_changed", // E06
  "promo_invalid", // E08
  "shipping_unavailable", // E14
  "variant_unavailable", // E12
  "out_of_stock", // E05
  "payment_declined", // E15 known decline
  "payment_uncertain", // E15 unknown status
  "cancel_ineligible", // E21
  "return_ineligible",
  "refund_denied", // E22
  "refund_exceeds_balance",
  "version_conflict", // E25, E24 concurrency, B13 overwrite guard
  "network_error", // E18 (client-side only; never sent by the server)
  "internal",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
