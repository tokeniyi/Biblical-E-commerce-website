export const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("AUTH_SECRET environment variable is required");
  }
}

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
export const PORT = parsePort(process.env.PORT ?? "3001");

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }
  return port;
}
