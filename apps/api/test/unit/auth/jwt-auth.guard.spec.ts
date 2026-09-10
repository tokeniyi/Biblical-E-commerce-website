import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { JwtStrategy } from "@/auth/jwt.strategy";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import * as jwt from "jsonwebtoken";

// The shared secret is loaded from .env.test by test/setup.js before any
// module initializes, so JwtStrategy and apps/web/auth.ts see the same value.
const UNIT_SECRET = process.env.AUTH_SECRET as string;

function sign(payload: Record<string, unknown>): string {
  return jwt.sign(payload, UNIT_SECRET) as string;
}

function decodePayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
}

describe("JwtStrategy (unit)", () => {
  // validate() only checks payload SHAPE — signature/expiry verification
  // happens in passport's authenticate() flow, exercised by JwtAuthGuard below.
  it("parses a validly-signed JWT into an AuthJwtPayload", () => {
    const strategy = new JwtStrategy();
    const token = sign({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = strategy.validate(decodePayload(token));
    expect(result.sub).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    expect(result.email).toBe("test@example.com");
  });

  it("throws on a payload missing required fields", () => {
    const strategy = new JwtStrategy();
    const token = sign({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(() => strategy.validate(decodePayload(token))).toThrow();
  });
});

describe("JwtAuthGuard (unit)", () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    guard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
  });

  function createContext(token: string | null) {
    const request = {
      headers: {
        authorization: token ? `Bearer ${token}` : undefined,
      },
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    return mockExecutionContext;
  }

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("rejects a request with no Authorization header", async () => {
    const context = createContext(null);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it("accepts a validly-signed, unexpired JWT", async () => {
    const token = sign({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const context = createContext(token);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("rejects a JWT signed with the wrong secret", async () => {
    const token = jwt.sign(
      {
        sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        email: "test@example.com",
        name: "Test User",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "wrong-secret",
    );

    const context = createContext(token);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it("rejects an expired JWT", async () => {
    const token = sign({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    const context = createContext(token);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it("rejects a payload missing required fields", async () => {
    const token = sign({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const context = createContext(token);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });
});