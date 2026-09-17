import { UnauthorizedException } from "@nestjs/common";
import { AuthJwtPayloadSchema, type AuthJwtPayload } from "@your-app/shared";

export function validateJwtPayload(payload: unknown): AuthJwtPayload {
  const result = AuthJwtPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new UnauthorizedException("Invalid authentication token");
  }
  return result.data;
}
