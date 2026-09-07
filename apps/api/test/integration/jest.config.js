/**
 * Integration test config — runs on PR open/update, before merge is allowed.
 * Expects a real Postgres instance reachable via DATABASE_URL (see
 * .github/workflows/pr-checks.yml, which spins one up as a service container)
 * and Paystack/Stripe/Sanity webhook fixtures under ./fixtures.
 *
 * Do NOT point this at a shared dev/staging database — it should run
 * migrations against a throwaway instance and tear it down after.
 */
module.exports = {
  displayName: "integration",
  rootDir: "../../",
  testMatch: ["<rootDir>/test/integration/**/*.int-spec.ts"],
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  moduleFileExtensions: ["js", "json", "ts"],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};
