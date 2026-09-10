/**
 * Unit test config — runs on every push to a feature branch.
 * No database, no network calls. Mock everything external
 * (Prisma client, Paystack/Stripe SDKs, Cloudinary/S3 SDKs).
 */
module.exports = {
  displayName: "unit",
  rootDir: "../../",
  testMatch: [
    "<rootDir>/src/**/*.spec.ts",
    "<rootDir>/test/unit/**/*.spec.ts",
  ],
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["src/**/*.ts"],
  passWithNoTests: true,
  setupFiles: ["<rootDir>/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
  },
};