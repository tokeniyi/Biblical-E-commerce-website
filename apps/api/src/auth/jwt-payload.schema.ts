import { AuthJwtPayloadSchema, type AuthJwtPayload } from "@your-app/shared";

export function validateJwtPayload(payload: unknown): AuthJwtPayload {
  const result = AuthJwtPayloadSchema.safeParse(payload);
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(", ");
    throw new Error(`Invalid JWT payload: ${errors}`);
  }
  return result.data;
}
