import { describe, expect, it } from "vitest";
import {
  authConfig,
  authorizeDevelopmentCredentials,
} from "../src/auth";
import { decodeApiJwt, encodeApiJwt } from "../src/auth/jwt-codec";

const payload = {
  sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  email: "dev@example.com",
  name: "Development User",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe("Phase 3 Auth.js JWT contract", () => {
  it("uses a signed HS256 token that the API can verify", () => {
    const token = encodeApiJwt({
      token: payload,
      secret: process.env.AUTH_SECRET as string,
      maxAge: 3600,
    });

    expect(decodeApiJwt({ token, secret: process.env.AUTH_SECRET as string })).toEqual(
      expect.objectContaining(payload),
    );
    expect(token.split(".")).toHaveLength(3);
  });

  it("round-trips through the configured Auth.js JWT encoder and decoder", async () => {
    const token = await authConfig.jwt.encode({
      token: payload,
      secret: process.env.AUTH_SECRET as string,
      maxAge: 3600,
      salt: "authjs.session-token",
    });
    const decoded = await authConfig.jwt.decode({
      token,
      secret: process.env.AUTH_SECRET as string,
    });

    expect(decoded).toEqual(expect.objectContaining(payload));
  });

  it("accepts only the explicit development credentials", async () => {
    await expect(
      authorizeDevelopmentCredentials({
        email: "dev@example.com",
        password: "phase3-development-only",
      }),
    ).resolves.toEqual(
      expect.objectContaining({ id: payload.sub, email: payload.email }),
    );
    await expect(
      authorizeDevelopmentCredentials({ email: "dev@example.com", password: "wrong" }),
    ).resolves.toBeNull();
  });

  it("maps the configured login identity into an API-verifiable JWT", async () => {
    const user = await authorizeDevelopmentCredentials({
      email: "dev@example.com",
      password: "phase3-development-only",
    });
    expect(user).not.toBeNull();

    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();
    if (!user || !jwtCallback) return;

    const tokenClaims = await jwtCallback({ token: {}, user });
    expect(tokenClaims).not.toBeNull();
    if (!tokenClaims) return;

    const token = await authConfig.jwt.encode({
      token: tokenClaims,
      secret: process.env.AUTH_SECRET as string,
      maxAge: 3600,
      salt: "authjs.session-token",
    });
    const decoded = decodeApiJwt({
      token,
      secret: process.env.AUTH_SECRET as string,
    });

    expect(decoded).toEqual(
      expect.objectContaining({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      }),
    );
  });
});
