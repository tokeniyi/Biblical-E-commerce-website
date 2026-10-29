import { describe, expect, it } from "vitest";
import {
  LoginInputSchema,
  ProfileInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  parseAccountOrdersQuery,
} from "../account.schema";

const register = {
  firstName: "Jordan",
  lastName: "Lee",
  email: "new@example.com",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
  termsAccepted: true,
};

function errorsOf(result: { success: boolean; error?: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } } }) {
  return result.success ? {} : result.error?.flatten().fieldErrors;
}

describe("LoginInputSchema (A01)", () => {
  it("requires both fields with inline messages", () => {
    expect(errorsOf(LoginInputSchema.safeParse({ email: "", password: "" }))).toEqual({
      email: ["Enter an email address.", "Enter a valid email address."],
      password: ["Enter your password."],
    });
  });

  it("defaults keep-signed-in to off", () => {
    expect(LoginInputSchema.parse({ email: "a@b.co", password: "x" }).keepSignedIn).toBe(false);
  });
});

describe("RegisterInputSchema (A02)", () => {
  it("accepts a valid sign-up; marketing opt-in starts unchecked", () => {
    expect(RegisterInputSchema.parse(register).marketingOptIn).toBe(false);
  });

  it("needs 12+ characters, matching passwords and the Terms", () => {
    const errors = errorsOf(
      RegisterInputSchema.safeParse({ ...register, password: "short", confirmPassword: "other", termsAccepted: false }),
    );
    expect(errors).toMatchObject({
      password: ["Use at least 12 characters."],
      termsAccepted: ["Agree to the Terms to continue."],
    });
  });

  it("reports a mismatch on the confirmation field", () => {
    expect(errorsOf(RegisterInputSchema.safeParse({ ...register, confirmPassword: "correct horse batterY" }))).toEqual({
      confirmPassword: ["Passwords don’t match."],
    });
  });
});

describe("ResetPasswordInputSchema (A06)", () => {
  it("flags a mismatch inline", () => {
    const result = ResetPasswordInputSchema.safeParse({ token: "t", password: "a long new password", confirmPassword: "different" });
    expect(errorsOf(result)).toEqual({ confirmPassword: ["Passwords don’t match."] });
  });
});

describe("ProfileInputSchema (A08)", () => {
  it("uses the Figma validation copy for a bad email", () => {
    const result = ProfileInputSchema.safeParse({ firstName: "Jordan", lastName: "Lee", email: "jordan@", marketingOptIn: false });
    expect(errorsOf(result)).toEqual({ email: ["Enter a valid email address."] });
  });
});

describe("parseAccountOrdersQuery (A10)", () => {
  it("reads the URL and falls back on bad values", () => {
    expect(parseAccountOrdersQuery(new URLSearchParams("status=shipped&q=bs-104&page=2"))).toEqual({
      status: "shipped",
      q: "bs-104",
      page: 2,
    });
    expect(parseAccountOrdersQuery({ status: "nope", page: "-3" })).toEqual({ status: "all", q: "", page: 1 });
  });
});
