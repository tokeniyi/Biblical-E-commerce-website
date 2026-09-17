import { sign, verify, type JwtPayload } from "jsonwebtoken";

export const TOKEN_ALGORITHM = "HS256" as const;

function requiredSecret(secret: string | string[] | undefined): string {
  const value = Array.isArray(secret) ? secret[0] : secret;
  if (!value) throw new Error("AUTH_SECRET environment variable is required");
  return value;
}

export function encodeApiJwt({
  token,
  secret,
  maxAge,
}: {
  token?: Record<string, unknown>;
  secret: string | string[];
  maxAge: number;
}): string {
  const payload = token ?? {};
  const options = {
    algorithm: TOKEN_ALGORITHM,
    ...(payload.exp === undefined ? { expiresIn: maxAge } : {}),
  } as const;
  return sign(payload, requiredSecret(secret), options);
}

export function decodeApiJwt({
  token,
  secret,
}: {
  token?: string;
  secret: string | string[];
}): Record<string, unknown> | null {
  if (!token) return null;

  try {
    const decoded = verify(token, requiredSecret(secret), {
      algorithms: [TOKEN_ALGORITHM],
    });
    return typeof decoded === "string" ? null : (decoded as JwtPayload);
  } catch {
    return null;
  }
}
