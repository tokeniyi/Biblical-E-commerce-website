# Authentication (Auth.js + NestJS JWT Guard)

**Feature branch:** `feature/auth-jwt`
**Depends on:** `feature/shared-core-types` (merged), `feature/prisma-schema` (merged)
**Related architecture doc:** §3.1 of `ARCHITECTURE.md`

## Goal

Implement JWT-based authentication where:

- `apps/web` (Next.js) uses Auth.js v5 with `strategy: "jwt"` to authenticate users and issue a signed JWT.
- `apps/api` (NestJS) independently verifies that JWT on every protected request using a shared `AUTH_SECRET` — no database session lookup, no shared process with Next.js.
- Both sides share the exact JWT payload contract via `packages/shared/src/schemas/auth.schema.ts`.

## Prerequisites

Before starting any task below, confirm:

- `feature/shared-core-types` is merged. `AuthJwtPayloadSchema` exists in `packages/shared/src/schemas/auth.schema.ts`.
- `feature/prisma-schema` is merged. `User` model exists in `apps/api/prisma/schema.prisma`.
- You have a generated `AUTH_SECRET` (32+ random characters). Use the same value in both `apps/web/.env.local` and `apps/api/.env`.
- Local Postgres is running and `DATABASE_URL` / `DIRECT_URL` are set in `apps/api/.env`.
- pnpm workspaces are installed (`pnpm install` from repo root).

---

## Task 1: Shared Contract Audit

**Purpose:** Confirm the contract both apps will share is complete and correct.

**Steps:**

1. Open `packages/shared/src/schemas/auth.schema.ts`.
2. Confirm it exports:
   - `AuthJwtPayloadSchema` (Zod) with fields: `sub` (uuid), `email` (email), `name` (nullable string, optional), `iat` (number), `exp` (number).
   - `AuthJwtPayload` (TypeScript type).
3. Confirm `packages/shared/src/schemas/index.ts` re-exports `./auth.schema`.

**Expected result:** Both exports exist and compile. No code changes needed unless you want to add more claims (e.g., `role`). If you add claims, update the Auth.js JWT callback on the Next.js side AND the NestJS guard — both must stay in sync.

**Test:**

- **Unit (shared):** Run `pnpm test --filter @your-app/shared`. All existing schema tests pass.

**Do not proceed to Task 2 until this passes.**

---

## Task 2: apps/web — Install Auth.js v5 and Dependencies

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

## Task 4: apps/web — Create Auth.js Configuration

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

**Contract enforcement:** The JWT callback's return shape is the single source of truth for the token NestJS will verify. Keep it aligned with `AuthJwtPayloadSchema`.

**Test:**

- **Unit:** Import `auth.ts` in a test and call the JWT callback with a mock user. Assert the returned object passes `AuthJwtPayloadSchema.parse()`.
- **Manual:** Run `pnpm dev` in `apps/web`. Visit `/api/auth/providers` (or equivalent Auth.js route) and confirm it returns 200 without crashing.

**Do not proceed to Task 5 until this passes.**

---

## Task 5: apps/web — Create Auth.js Route Handler

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

**Purpose:** Give users a way to trigger sign-in and sign-out.

**Steps:**

1. Create `apps/web/src/app/login/page.tsx` with a simple sign-in form/button using `signIn()` from `next-auth/react`.
2. Create `apps/web/src/app/logout/page.tsx` with a sign-out button using `signOut()` from `next-auth/react`.
3. Update `apps/web/src/app/page.tsx` to show a login link if unauthenticated, or a logout link if authenticated (use `useSession` or `getServerSession`).

**Test:**

- **E2E/manual:** Run `pnpm dev`. Open the home page. Click login. Confirm you are signed in. Click logout. Confirm you are signed out.

---

## Task 7: apps/web — Create API Client Helper for Bearer Token

**Purpose:** Attach the JWT as `Authorization: Bearer` on every request to `apps/api`.

**Steps:**

1. Create `apps/web/src/lib/api-client.ts`.
2. Export a `getApiFetch()` helper that:
   - Gets the current session (server-side via `getServerSession(authOptions)` or client-side via `useSession`).
   - Attaches `Authorization: Bearer <token>` header to requests going to `apps/api`.
   - Handles 401 responses by clearing the session and redirecting to login.
3. Alternatively, create a lightweight wrapper around `fetch` that accepts the endpoint and options and injects the header.

**Rules:**

- Do NOT proxy file bytes or sensitive data through this helper. It only adds headers.
- Do NOT store the token in `localStorage`. Use Auth.js session state.

**Test:**

- **Unit:** Mock `getServerSession` to return a fake session with a fake JWT. Assert the helper calls `fetch` with the `Authorization` header set correctly.
- **Manual:** From a signed-in browser session, open DevTools > Network. Make an API call via the helper. Confirm the `Authorization: Bearer ...` header is present.

---

## Task 8: apps/api — Bootstrap NestJS Application

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

**Contract enforcement:** The strategy's extracted user object shape must align with what `CurrentUser` decorator expects.

**Test:**

- **Unit:** Mock `passport-jwt` to return a decoded payload. Call the strategy's `validate` with a valid payload. Assert it returns the expected user object. Call it with an invalid payload. Assert it throws.
- **Unit:** Test that a missing or malformed `Authorization` header results in null/failure (Passport's `ExtractJwt` handles this, but confirm it).

---

## Task 12: apps/api — Create JWT Auth Guard

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

## Task 15: End-to-End Integration Test (Cross-App)

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
