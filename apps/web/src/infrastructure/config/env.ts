export const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error("AUTH_SECRET environment variable is required");
}

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

const isDevelopmentOrTest =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

// Phase 3 has no production account provider in the architecture yet. These
// credentials are deliberately available only for local development/tests.
export const AUTH_DEV_EMAIL = isDevelopmentOrTest
  ? (process.env.AUTH_DEV_EMAIL ?? "dev@example.com")
  : undefined;
export const AUTH_DEV_PASSWORD = isDevelopmentOrTest
  ? (process.env.AUTH_DEV_PASSWORD ?? "phase3-development-only")
  : undefined;
export const AUTH_DEV_USER_ID = isDevelopmentOrTest
  ? (process.env.AUTH_DEV_USER_ID ?? "3fa85f64-5717-4562-b3fc-2c963f66afa6")
  : undefined;
