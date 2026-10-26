import jwt from "jsonwebtoken";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { ExecutionContext } from "@nestjs/common";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
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
    const secret = process.env.AUTH_SECRET || "test-secret-for-unit-tests-only";

    const payload = {
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwt.sign(payload, secret);

    const context = createContext(token);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("rejects a JWT signed with the wrong secret", async () => {

    const payload = {
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwt.sign(payload, "wrong-secret");

    const context = createContext(token);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it("rejects an expired JWT", async () => {
    const secret = process.env.AUTH_SECRET || "test-secret-for-unit-tests-only";

    const payload = {
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    };

    const token = jwt.sign(payload, secret);

    const context = createContext(token);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it("rejects a payload missing required fields", async () => {
    const secret = process.env.AUTH_SECRET || "test-secret-for-unit-tests-only";

    const payload = {
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwt.sign(payload, secret);

    const context = createContext(token);
    await expect(guard.canActivate(context)).rejects.toThrow();
  });
});
