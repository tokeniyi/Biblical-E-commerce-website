export const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("AUTH_SECRET environment variable is required");
  }
}

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
export const PORT = parseInt(process.env.PORT ?? "3000", 10);
