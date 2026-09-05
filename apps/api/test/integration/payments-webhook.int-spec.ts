/**
 * EXAMPLE — replace with real handlers once payments module exists.
 *
 * Pattern for webhook signature testing:
 *  1. Load a captured/sample payload from ./fixtures (one per provider)
 *  2. Sign it with a TEST secret (from CI secrets, never a real prod secret)
 *  3. Post it to your actual NestJS route (not a mocked handler) so the
 *     real signature-verification middleware runs
 *  4. Assert both: the signature check passes, AND the transaction row
 *     gets written to Postgres in your app's unified shape regardless
 *     of which provider (Paystack vs Stripe) sent it.
 *
 * Fixture-based tests like this run on every PR. Separately, consider a
 * scheduled (e.g. nightly) job that fires real Paystack/Stripe sandbox
 * test-mode webhooks via their CLIs, to catch drift between your fixtures
 * and what the providers actually send.
 */

describe("POST /webhooks/payments (integration)", () => {
  it.todo("accepts a validly-signed Paystack test webhook and writes a transaction row");
  it.todo("accepts a validly-signed Stripe test webhook and writes a transaction row");
  it.todo("rejects a payload with an invalid signature");
  it.todo("writes the same transaction shape regardless of provider");
});
