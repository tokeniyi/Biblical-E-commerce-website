import { describe, expect, it } from "vitest";
import { AuthJwtPayloadSchema } from "../auth.schema";

const now = Math.floor(Date.now() / 1000);

const validPayload = {
  sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  email: "test@example.com",
  name: "Test User",
  iat: now,
  exp: now + 3600,
};

describe("AuthJwtPayloadSchema", () => {
  it("accepts a valid JWT payload", () => {
    expect(AuthJwtPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects a payload missing 'sub'", () => {
    const { sub, ...withoutSub } = validPayload;
    expect(AuthJwtPayloadSchema.safeParse(withoutSub).success).toBe(false);
  });

  it("rejects a non-uuid 'sub'", () => {
    const result = AuthJwtPayloadSchema.safeParse({ ...validPayload, sub: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("allows 'name' to be omitted or null", () => {
    const { name, ...withoutName } = validPayload;
    expect(AuthJwtPayloadSchema.safeParse(withoutName).success).toBe(true);
    expect(AuthJwtPayloadSchema.safeParse({ ...validPayload, name: null }).success).toBe(true);
  });
});