# Authentication (Auth.js + NestJS JWT Guard)

**Feature branch:** `feature/auth-jwt`
**Depends on:** `feature/shared-core-types` (merged), `feature/prisma-schema` (merged)
**Related architecture doc:** §3.1 of `ARCHITECTURE.md`

## Goal

Implement JWT-based authentication where:

- `apps/web` (Next.js) uses Auth.js v5 with `strategy: "jwt"` to authenticate users and issue a signed JWT.
- `apps/api` (NestJS) independently verifies that JWT on every protected request using a shared `AUTH_SECRET` — no database session lookup, no shared process with Next.js.
- Both sides share the exact JWT payload contract via `packages/shared/src/schemas/auth.schema.ts`.

## Why This Architecture? (Stateless JWT, Not Database Sessions)

This is decided, not open for debate at implementation time — see `ARCHITECTURE.md` §3.1 for the full reasoning. Short version:

- ✓ **No shared session database** — `apps/api` never has to hit Postgres just to check if a request is authenticated.
- ✓ **Serverless-friendly** — Neon is serverless/decoupled; a DB-session lookup on every request would add latency and inflate connection usage. JWT verification is local.
- ✓ **Independent deploys** — `apps/web` (Vercel) and `apps/api` (Railway/Fly.io) never share a process or a session store. They share exactly one secret: `AUTH_SECRET`.
- ✓ **Self-contained requests** — every request carries everything `apps/api` needs to verify it, with no round trip back to Next.js or Auth.js.

If you're extending or troubleshooting this system later, this is the constraint everything else in this doc is built around.

```
Browser
   │  login
   ▼
Next.js / Auth.js  ──issues JWT──▶  Browser
                                       │  Bearer token
                                       ▼
                                   NestJS ──verify──▶ Controller
```

## Architecture Principle: Who Owns the JWT

This single paragraph resolves most of the confusion new contributors hit:

- **Auth.js (`apps/web`)** issues JWTs. It signs them, stores them (typically as an httpOnly cookie), and refreshes/rotates them.
- **NestJS (`apps/api`)** never issues JWTs and never modifies JWTs. It only **verifies** them — signature + expiry — using the shared `AUTH_SECRET`.

If you find yourself writing code in `apps/api` that creates or re-signs a token, stop — that's a sign the JWT is being generated in the wrong place.

### JWT vs. Session — these are not the same thing

| | JWT | Session (React) |
|---|---|---|
| **Sent to** | `apps/api` (as `Authorization: Bearer <token>`) | Not sent anywhere — it's client-side UI state |
| **Purpose** | Authorization for API calls | Drives what the UI renders (logged in/out, user's name, etc.) |
| **Verified by** | NestJS (`JwtAuthGuard` / `jwt.strategy.ts`) | Not "verified" — it's just read by React components |

They're related but derived from each other in one direction only:

```
JWT (signed, on the wire)
  ↓
Auth.js `session` callback (reads the JWT payload)
  ↓
`session.user` (what `useSession()` / `auth()` return to your components)
```

Do not conflate "the session looks logged out" with "the JWT is invalid" — they can drift if the `session` callback and the JWT payload aren't kept in sync. If you change one, check the other.

## Prerequisites

Before starting any task below, confirm:

- `feature/shared-core-types` is merged. `AuthJwtPayloadSchema` exists in `packages/shared/src/schemas/auth.schema.ts`.
- `feature/prisma-schema` is merged. `User` model exists in `apps/api/prisma/schema.prisma` and includes, at minimum, the fields authentication depends on:

  ```prisma
  model User {
    id           String   @id @default(cuid())
    email        String   @unique
    passwordHash String
    name         String?
  }
  ```

  **⚠️ Verify this against the actual `feature/prisma-schema` model before starting Task 4/9** — this is the canonical shape assumed by this guide, not a guarantee of what was actually merged. If the real model differs (different field names, an enum for role, etc.), reconcile the two before writing the Credentials provider or the JWT payload mapping, so every developer is working from the same schema instead of inventing their own.

- You have a generated `AUTH_SECRET` (32+ random characters). Use the same value in both `apps/web/.env.local` and `apps/api/.env`. Generate one with either:

  ```bash
  npx auth secret        # Auth.js v5 CLI helper — writes/prints a secret
  # or
  openssl rand -base64 32
  ```

- Local Postgres is running and `DATABASE_URL` / `DIRECT_URL` are set in `apps/api/.env`.
- pnpm workspaces are installed (`pnpm install` from repo root).

---

## Seed Test User

Tasks 14–16 assume you can log in, but nothing above explains how to get a user into the database. Every developer should be testing against the same credentials:

- **Email:** `test@example.com`
- **Password:** `password123`

Seed it with a Prisma seed script (`apps/api/prisma/seed.ts`) that hashes the password with bcrypt before inserting — do not store `password123` in plaintext in the `passwordHash` column:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", passwordHash, name: "Test User" },
  });
}

main().finally(() => prisma.$disconnect());
```

Wire it as the `prisma.seed` entry in `apps/api/package.json` and run with `pnpm --filter api prisma db seed`. **Confirm the exact seed command/tooling against what `feature/prisma-schema` actually set up** — if that branch already established a seeding convention, use it instead of introducing a second one.

---

## Task 1: Shared Contract Audit

**Depends on:** nothing — this is the starting point.

**Why this contract exists:** `AuthJwtPayloadSchema` is the canonical contract between the JWT producer (Auth.js, on `apps/web`) and the JWT consumer (NestJS, on `apps/api`). Neither side owns it unilaterally — any change to the schema must be implemented on both sides in the same PR, or the two apps will silently disagree about what a valid token looks like.

**Purpose:** Confirm the contract both apps will share is complete and correct.

**Steps:**

1. Open `packages/shared/src/schemas/auth.schema.ts`.
2. Confirm it exports:
   - `AuthJwtPayloadSchema` (Zod) with fields: `sub` (uuid), `email` (email), `name` (nullable string, optional), `iat` (number), `exp` (number).
   - `AuthJwtPayload` (TypeScript type).
3. Confirm `packages/shared/src/schemas/index.ts` re-exports `./auth.schema`.

**`iat`/`exp` are in seconds, not milliseconds:** per [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) §2, JWT `NumericDate` values are seconds since the Unix epoch — not `Date.now()`'s milliseconds. If either side computes these with `Date.now()` directly instead of `Math.floor(Date.now() / 1000)`, tokens will appear expired almost immediately (if compared as seconds elsewhere) or valid for ~1000x longer than intended (if the mismatch goes the other way). Auth.js's JWT encoding and NestJS's `passport-jwt`/`jose` verification both assume seconds — this is why the schema's `iat`/`exp` are typed as plain numbers rather than `Date` objects.

**Expected result:** Both exports exist and compile. No code changes needed unless you want to add more claims (e.g., `role`). If you add claims, update the Auth.js JWT callback on the Next.js side AND the NestJS guard — both must stay in sync.

**Test:**

- **Unit (shared):** Run `pnpm test --filter @your-app/shared`. All existing schema tests pass.

**Do not proceed to Task 2 until this passes.**

---

## Task 2: apps/web — Install Auth.js v5 and Dependencies

**Depends on:** Task 1 (shared contract confirmed).

**Purpose:** Add the Next.js auth libraries and the JWT library we will use.

**Steps:**

1. In `apps/web`, install:
   ```bash
   pnpm add next-auth@beta @auth/core jose
   pnpm add -D @types/jose
   ```
2. Confirm `package.json` now lists these dependencies.
3. Confirm the install completed without peer conflicts.

**Test:**

- **Build:** Run `pnpm build` in `apps/web`. It should compile without errors.

**Do not proceed to Task 3 until this passes.**

---

## Task 3: apps/web — Environment Configuration

**Depends on:** Task 2 (Auth.js installed).

**Purpose:** Add `AUTH_SECRET` to the Next.js environment.

**Steps:**

1. Open `apps/web/.env.local`.
2. Add:
   ```env
   AUTH_SECRET="your-32+ char secret here"
   ```
3. If `.env.local` is gitignored (it should be), confirm the secret will not be committed.
4. Confirm `apps/api/.env` also has the exact same `AUTH_SECRET` value.

**Critical rule:** `AUTH_SECRET` must be identical in every environment (dev, staging, production) for both apps. Do not generate it independently per app.

**Test:**

- **Manual:** Print both values from each app's env loader in a temporary route or script and confirm they match.

---

### Login Flow, End to End

```
User
 │  submits email + password
 ▼
Next.js Login (Credentials provider)
 │  Auth.js runs authorize()
 ▼
JWT Created (signed with AUTH_SECRET)
 │  stored as httpOnly cookie
 ▼
Browser
 │  apps/web attaches it as Authorization: Bearer <token>
 ▼
NestJS
 │  Passport verifies signature
 ▼
Controller (e.g. GET /auth/me)
```

## Task 4: apps/web — Create Auth.js Configuration

**Depends on:** Task 3 (`AUTH_SECRET` configured in both apps).

**Purpose:** Set up Auth.js v5 with JWT strategy.

**Steps:**

1. Create `apps/web/src/auth.ts`.
2. Configure Auth.js with:
   - `strategy: "jwt"`
   - `secret: process.env.AUTH_SECRET`
   - Minimal providers (start with Credentials or a dummy provider for testing; we are not wiring real OAuth yet).
   - `callbacks.jwt`: Create the JWT payload from the user session. The returned object must match `AuthJwtPayloadSchema`:
     - `sub`: user id (string, uuid)
     - `email`: user email
     - `name`: user name (nullable)
     - `iat`: issued-at timestamp
     - `exp`: expiry timestamp
   - `callbacks.session`: Return `{ user: { id, email, name } }` from the JWT so the session is usable in React/components.
3. Export the auth config as default.

### Credentials Provider Authentication

Task 4 says "Credentials or dummy provider" but doesn't specify how credentials are actually checked — this closes that gap. If you use `CredentialsProvider`, its `authorize()` function must authenticate against the `User` table:

1. Look up the user by email using Prisma (`prisma.user.findUnique({ where: { email } })`).
2. Compare the submitted password against the stored `passwordHash` using `bcrypt.compare()`.
3. Return the user object if authentication succeeds.
4. Return `null` if the user doesn't exist or the password doesn't match — do not throw; Auth.js expects `null` for "auth failed."

A dummy/no-op provider (always returns a fixed fake user) may be used only for temporary scaffolding while other tasks are being built in parallel — it must not reach a PR that's meant to be mergeable, since it means nothing is actually being verified.

**Contract enforcement:** The JWT callback's return shape is the single source of truth for the token NestJS will verify. Keep it aligned with `AuthJwtPayloadSchema`.

**Test:**

- **Unit:** Import `auth.ts` in a test and call the JWT callback with a mock user. Assert the returned object passes `AuthJwtPayloadSchema.parse()`.
- **Manual:** Run `pnpm dev` in `apps/web`. Visit `/api/auth/providers` (or equivalent Auth.js route) and confirm it returns 200 without crashing.

**Do not proceed to Task 5 until this passes.**

---

## Task 5: apps/web — Create Auth.js Route Handler

**Depends on:** Task 4 (Auth.js config exists).

**Purpose:** Expose Auth.js endpoints in Next.js App Router.

**Steps:**

1. Create `apps/web/src/app/api/auth/[...nextauth]/route.ts`.
2. Import `auth` from `@/auth`.
3. Export GET and POST handlers that forward to `auth`.

```typescript
import { auth } from "@/auth";

export const GET = auth;
export const POST = auth;
```

4. Confirm `apps/web/tsconfig.json` has a path alias for `@/` pointing to `./src/*` (it should already exist). If not, add it:

```json
"paths": {
  "@/": ["./src/*"]
}
```

**Test:**

- **Integration:** Run `pnpm dev`. Visit `/api/auth/signin`. Confirm the sign-in page renders.
- **Integration:** Visit `/api/auth/signout`. Confirm it returns a redirect or 200 without crashing.

---

## Task 6: apps/web — Create Login/Logout UI (Minimal)

**Depends on:** Task 5 (route handler exposed).

**Purpose:** Give users a way to trigger sign-in and sign-out.

**Steps:**

1. Create `apps/web/src/app/login/page.tsx` with a simple sign-in form/button using `signIn()` from `next-auth/react`.
2. Create `apps/web/src/app/logout/page.tsx` with a sign-out button using `signOut()` from `next-auth/react`.
3. Update `apps/web/src/app/page.tsx` to show a login link if unauthenticated, or a logout link if authenticated (use `useSession` or `getServerSession`).

**Test:**

- **E2E/manual:** Run `pnpm dev`. Open the home page. Click login. Confirm you are signed in. Click logout. Confirm you are signed out.

---

## Task 7: apps/web — Create API Client Helper for Bearer Token

**Depends on:** Task 6 (login/logout UI works, so there's a session to test against).

**Purpose:** Attach the JWT as `Authorization: Bearer` on every request to `apps/api`.

**Steps:**

1. Create `apps/web/src/lib/api-client.ts`.
2. Export a `getApiFetch()` helper that gets the current session and attaches `Authorization: Bearer <token>` to requests going to `apps/api`. Don't leave "get the session" open-ended — use exactly one method per context, matching Auth.js v5's API (this replaces the v4 `getServerSession(authOptions)` pattern):
   - **Server Components / Route Handlers / Server Actions:** use `auth()`, exported from `apps/web/src/auth.ts` (Task 4). It reads the session server-side with no extra provider needed.
   - **Client Components:** use `useSession()` from `next-auth/react`, wrapped in a `<SessionProvider>` higher up the tree.
3. Handle 401 responses by clearing the session and redirecting to login.
4. Alternatively, create a lightweight wrapper around `fetch` that accepts the endpoint and options and injects the header — but it should still call `auth()`/`useSession()` internally per the rule above, not invent a third way to read the session.

**Rules:**

- Do NOT proxy file bytes or sensitive data through this helper. It only adds headers.
- Do NOT store the token in `localStorage`. Use Auth.js session state.

**Test:**

- **Unit:** Mock `getServerSession` to return a fake session with a fake JWT. Assert the helper calls `fetch` with the `Authorization` header set correctly.
- **Manual:** From a signed-in browser session, open DevTools > Network. Make an API call via the helper. Confirm the `Authorization: Bearer ...` header is present.

---

## Task 8: apps/api — Bootstrap NestJS Application

**Depends on:** nothing on the `apps/web` side — this can be built in parallel with Tasks 2–7 once Task 1 (shared contract) is confirmed.

**Purpose:** Create the NestJS app structure if it does not already exist.

**Steps:**

1. Confirm `apps/api/src/` exists. If not, create it.
2. Create `apps/api/src/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || true });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

3. Create `apps/api/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";

@Module({})
export class AppModule {}
```

4. Confirm `apps/api/package.json` has the NestJS scripts (`start:dev`, `build`, etc.). They should already exist from the scaffold.
5. Confirm `apps/api/tsconfig.json` path aliases:

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@shared/*": ["../../packages/shared/src/*"]
  }
}
```

These should already exist. If not, add them.

**Test:**

- **Build:** Run `pnpm build` in `apps/api`. It should compile.
- **Manual:** Run `pnpm start:dev` in `apps/api`. Visit `http://localhost:3001/`. Confirm it returns 404 (no root route yet) but the server is running without crashing.

---

## Task 9: apps/api — Install Auth Dependencies

**Depends on:** Task 8 (NestJS app bootstrapped).

**Purpose:** Add Passport, JWT strategy, and JOSE libraries.

**Steps:**

1. In `apps/api`, install:

```bash
pnpm add @nestjs/passport passport passport-jwt jose
pnpm add -D @types/passport-jwt
```

2. Confirm `package.json` lists these dependencies.

**Test:**

- **Build:** Run `pnpm build` in `apps/api`. Compile clean.

---

## Task 10: apps/api — Create JWT Payload Validation

**Depends on:** Task 9 (auth dependencies installed).

**Purpose:** Validate the incoming JWT payload against the shared Zod schema before NestJS uses it.

**Steps:**

1. Create `apps/api/src/auth/jwt-payload.schema.ts`.
2. Import `AuthJwtPayloadSchema` from `@your-app/shared`.
3. Export a `validateJwtPayload` function that takes a raw payload object and returns `AuthJwtPayload` (or throws).
4. This function will be called inside the JWT strategy.

**Test:**

- **Unit:** Import `validateJwtPayload` in a test. Pass a valid payload matching `AuthJwtPayloadSchema`. Assert it returns without throwing. Pass an invalid payload (missing `sub`, invalid `email`). Assert it throws a validation error.

---

## Task 11: apps/api — Create JWT Strategy

**Depends on:** Task 10 (`validateJwtPayload` exists).

**Purpose:** Verify the JWT signature and extract the payload.

**Steps:**

1. Create `apps/api/src/auth/jwt.strategy.ts`.
2. Implement `Strategy` from `passport-jwt` (or extend `PassportStrategy` from `@nestjs/passport`).
3. Configure:
   - `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()`
   - `secretOrKey: process.env.AUTH_SECRET`

   **Important:** Use the same secret on both sides. Do NOT use asymmetric keys unless you have a specific reason.

4. In the `validate` method:
   - Call `validateJwtPayload(payload)` from Task 10.
   - Return the validated payload (or a subset) as the request user object.
   - If validation fails, throw `UnauthorizedException`.
5. Do NOT hit the database in the strategy. Verification is local — no DB round-trip.

**What `validate()` does — and doesn't — do:** this is one of the most common JWT misconceptions on this stack. By the time `validate()` runs, the signature *and* the expiry have **already** been checked — that's Passport's job, not yours:

```
JWT arrives (Authorization: Bearer <token>)
  │
  ▼
Verify signature (via secretOrKey / AUTH_SECRET)
  │   ← bad signature is rejected here, before your code runs
  ▼
Check expiry (exp claim vs. current time)
  │   ← expired token is rejected here too
  ▼
validate(payload)  ← your code — only re-checks payload *shape*
  │                    (via validateJwtPayload) and decides what
  │                    becomes req.user. It does not re-verify
  │                    the signature or expiry a second time.
  ▼
req.user
```

**Contract enforcement:** The strategy's extracted user object shape must align with what `CurrentUser` decorator expects.

**Test:**

- **Unit:** Mock `passport-jwt` to return a decoded payload. Call the strategy's `validate` with a valid payload. Assert it returns the expected user object. Call it with an invalid payload. Assert it throws.
- **Unit:** Test that a missing or malformed `Authorization` header results in null/failure (Passport's `ExtractJwt` handles this, but confirm it).

---

## Task 12: apps/api — Create JWT Auth Guard

**Depends on:** Task 11 (JWT strategy exists — the guard wraps it).

**Purpose:** Protect routes by requiring a valid JWT.

**Steps:**

1. Create `apps/api/src/auth/jwt-auth.guard.ts`.
2. Implement `AuthGuard("jwt")` from `@nestjs/passport`.
3. Export the guard class.

**Test:**

- **Unit:** Apply the guard to a mock controller. Use NestJS testing utilities to send requests with:
  - Valid JWT → expect 200
  - Invalid signature JWT → expect 401
  - Expired JWT → expect 401
  - Missing token → expect 401
- **Manual:** Run `pnpm start:dev`. Use `curl`:

```bash
curl -H "Authorization: Bearer VALID_TOKEN" http://localhost:3001/protected
curl http://localhost:3001/protected
```

---

## Task 13: apps/api — Create `@CurrentUser` Decorator

**Depends on:** Task 11 (strategy populates `req.user`) — can be built alongside Task 12.

**Purpose:** Extract the authenticated user ID from the verified JWT payload cleanly.

**Steps:**

1. Create `apps/api/src/auth/current-user.decorator.ts`.
2. Create a parameter decorator `@CurrentUser()` that reads `req.user` (set by Passport after strategy validation).
3. Optionally create typed versions: `@CurrentUser("sub")`, `@CurrentUser("email")` if you want to extract specific claims without casting.

**Example:**

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

**Test:**

- **Unit:** Mock a request with `user = { sub: "uuid", email: "test@example.com" }`. Apply decorator to a route parameter. Assert the parameter receives the full user object.

---

## Task 14: apps/api — Protect a Test Endpoint (GET /auth/me)

**Depends on:** Task 12 (guard) and Task 13 (decorator) — needs both.

**Purpose:** Create a real endpoint that returns the current authenticated user, proving the full auth chain works.

**Steps:**

1. Create `apps/api/src/auth/auth.controller.ts`.
2. Create a `GET /auth/me` endpoint:
   - Apply `@UseGuards(JwtAuthGuard)`.
   - Inject `@CurrentUser()` to get the user payload.
   - Return `{ sub, email, name }` (do NOT return the full JWT or secrets).
3. Register the controller in `AppModule` (or an `AuthModule` if you want to modularize now).

**Response shape (must match shared contract):**

```json
{
  "sub": "string",
  "email": "string",
  "name": "string | null"
}
```

**Test:**

- **Unit:** Test the controller with a mocked guard and mocked `@CurrentUser()`. Assert it returns the expected shape.
- **Integration:** Start the NestJS app. Send a request with a fixture JWT signed with the test `AUTH_SECRET`. Assert the response matches the payload in the token.
- **Integration (negative):** Send a request with no token, invalid token, and expired token. Assert all return 401.
- **E2E/manual:** From `apps/web`, log in, then call `/auth/me` via the API client helper. Confirm you get back your user data.

---

### Cross-App Verification Flow

```
apps/web (Auth.js)                      apps/api (NestJS)
       │                                        │
       │  issues JWT (signed w/ AUTH_SECRET)    │
       ▼                                        │
   JWT token ─────────── sent as ──────────────▶│
                    Authorization: Bearer         │
                                                  ▼
                                     JwtAuthGuard → jwt.strategy
                                     verifies signature locally
                                     (same AUTH_SECRET, no call
                                      back to apps/web)
                                                  │
                                                  ▼
                                          200 + req.user
```

## Task 15: End-to-End Integration Test (Cross-App)

**Depends on:** Task 7 (`apps/web` can attach the bearer token) and Task 14 (`apps/api` has a protected endpoint to hit).

**Purpose:** Verify a JWT issued by Auth.js on the Next.js side is accepted by the NestJS guard.

**Steps:**

1. Set up a test script or route in `apps/web` that calls Auth.js to get a session token in a test environment.
2. Send that token to `apps/api/auth/me`.
3. Assert the NestJS side returns 200 with the correct user data.

**Note:** This requires both apps running simultaneously (or mocked). For CI, consider:

- Running NestJS in a test container.
- Using Auth.js in a headless test (e.g., Playwright or a Next.js test server).

**Test:**

- **Integration:** Automated test that:
  - Hits `/api/auth/signin` (or mocks the Auth.js flow) to get a real JWT.
  - Hits `GET /auth/me` with that JWT.
  - Asserts 200 + correct user shape.
- **Manual:** Full browser flow: Login on Next.js → navigate to a page that calls the API → see your user data.

---

## Task 16: Token Expiry and Logout Verification

**Depends on:** Task 15 (full cross-app flow already verified for the happy path).

**Purpose:** Confirm the system correctly rejects expired tokens and clears tokens on logout.

**Steps:**

1. Generate a JWT with a very short expiry (e.g., 1 second).
2. Wait for expiry.
3. Call `GET /auth/me` with the expired token. Assert 401.
4. Log out from `apps/web`.
5. Confirm the JWT cookie/token is cleared.
6. Call `GET /auth/me` again. Assert 401.

**Test:**

- **E2E/manual:** Full login → wait for token to expire → call protected API → confirm rejection.
- **E2E/manual:** Login → logout → attempt API call → confirm rejection.

---

## Final Checklist Before PR

| Check | Command / Action |
|-------|-----------------|
| Shared schema unchanged | `git diff packages/shared` — should be empty unless you added claims |
| Web compiles | `pnpm build --filter web` |
| API compiles | `pnpm build --filter api` |
| Web unit tests pass | `pnpm test --filter web` |
| API unit tests pass | `pnpm test --filter api` |
| API integration tests pass | `pnpm test:integration --filter api` |
| Lint passes | `pnpm lint` in both apps |
| Typecheck passes | `pnpm typecheck` in both apps |
| `AUTH_SECRET` set in both envs | Check `apps/web/.env.local` and `apps/api/.env` |
| No secrets committed | `git grep -n "AUTH_SECRET"` — only `.env` files, no hardcoded values |

---

## Rollback / Safety Notes

- If Auth.js v5 causes issues, you can temporarily fall back to a custom credentials provider or a simple credentials-based login while keeping the JWT strategy on the NestJS side.
- The NestJS guard is independent — it does not depend on Auth.js being fully working. You can test it in isolation with fixture JWTs.
- **AUTH_SECRET rotation:** not covered in this feature. If you rotate it later, all existing JWTs become invalid. Plan a migration window.