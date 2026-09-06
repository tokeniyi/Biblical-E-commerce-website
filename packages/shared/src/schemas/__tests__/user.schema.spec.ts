import { describe, expect, it } from "vitest";
import { UserSchema, PublicUserSchema } from "../user.schema";

const validUser = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  email: "test@example.com",
  name: "Test User",
  image: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("UserSchema", () => {
  it("accepts a valid user payload", () => {
    expect(UserSchema.safeParse(validUser).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = UserSchema.safeParse({ ...validUser, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing id", () => {
    const { id, ...withoutId } = validUser;
    expect(UserSchema.safeParse(withoutId).success).toBe(false);
  });

  it("allows name and image to be omitted", () => {
    const { name, image, ...minimal } = validUser;
    expect(UserSchema.safeParse(minimal).success).toBe(true);
  });
});

describe("PublicUserSchema", () => {
  it("strips down to only public-safe fields", () => {
    const parsed = PublicUserSchema.parse(validUser);
    expect(Object.keys(parsed).sort()).toEqual(["email", "id", "image", "name"].sort());
  });
});