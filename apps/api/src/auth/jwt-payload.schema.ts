import { AuthJwtPayloadSchema, type AuthJwtPayload } from "@your-app/shared";

/**
 * Validates a raw JWT payload against the shared AuthJwtPayloadSchema.
 * This is called inside the NestJS JWT strategy after the signature and expiry
 * have already been verified by passport-jwt.
 *
 * @param payload - The raw decoded JWT payload object
 * @returns The validated AuthJwtPayload type
 * @throws {Error} if the payload is invalid
 */
export function validateJwtPayload(
  payload: unknown,
): AuthJwtPayload {
  const result = AuthJwtPayloadSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(", ");
    throw new Error(`Invalid JWT payload: ${errors}`);
  }

  return result.data;
}