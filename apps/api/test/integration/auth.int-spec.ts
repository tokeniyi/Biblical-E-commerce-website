import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import http from "http";
import * as jwt from "jsonwebtoken";
import { encodeApiJwt } from "../../../../apps/web/src/auth/jwt-codec";

function request(
  port: number,
  path: string,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode ?? 0, body: data });
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("GET /auth/me (integration)", () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule);
    await app.init();
    // Start the real HTTP server on an ephemeral port so we can resolve the
    // actual port and issue real HTTP requests through the full middleware
    // stack (guard, passport, route handler) — no mocks.
    await new Promise<void>((resolve) => {
      const server = app.getHttpServer() as http.Server;
      server.listen(0, "127.0.0.1", () => {
        const address = server.address() as { port: number };
        port = address.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with the authenticated user for a validly-signed JWT", async () => {
    const token = encodeApiJwt({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const { status, body } = await request(port, "/auth/me", token);

    expect(status).toBe(200);
    expect(body).toEqual({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
    });
  });

  it("returns 401 for a JWT signed with a different secret", async () => {
    const token = jwt.sign(
      {
        sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        email: "test@example.com",
        name: "Test User",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "not-the-shared-secret",
    ) as string;

    const { status } = await request(port, "/auth/me", token);

    expect(status).toBe(401);
  });

  it("returns 401 for an expired JWT", async () => {
    const token = encodeApiJwt({
      sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "test@example.com",
      name: "Test User",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    const { status } = await request(port, "/auth/me", token);

    expect(status).toBe(401);
  });

  it("returns 401 when no Authorization header is sent", async () => {
    const { status } = await request(port, "/auth/me");

    expect(status).toBe(401);
  });

  it("returns 401 for a validly-signed token with invalid claims", async () => {
    const token = jwt.sign(
      {
        sub: "not-a-uuid",
        email: "test@example.com",
        name: "Test User",
      },
      process.env.AUTH_SECRET as string,
      { algorithm: "HS256", expiresIn: 3600 },
    );

    const { status } = await request(port, "/auth/me", token);

    expect(status).toBe(401);
  });
});
