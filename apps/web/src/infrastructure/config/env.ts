export const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error("AUTH_SECRET environment variable is required");
}

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";