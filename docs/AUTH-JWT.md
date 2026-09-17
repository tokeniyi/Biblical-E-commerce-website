# Feature: auth-jwt

**Commit:** `1f77142`
**Branch:** `feature/auth-jwt`
**Status:** Complete

---

## What This Feature Implements

Auth.js `5.0.0-beta.32` uses encrypted JWT sessions by default. Because the
architecture requires NestJS to verify the token independently, this feature
configures Auth.js with an explicit HS256 JWS encoder/decoder and restricts
the NestJS Passport strategy to HS256. The CredentialsProvider is limited to
development/test use because the architecture does not yet define a
production account provider or password store.

A JWT-based authentication foundation that lets Next.js (`apps/web`) and NestJS (`apps/api`) independently verify the same user session without sharing a process or database session store.

Both apps share a single `AUTH_SECRET`. Next.js signs JWTs via Auth.js (`strategy: "jwt"`), and NestJS verifies them locally using `passport-jwt`.

---

## Files Added / Modified

### `apps/web`
| File | Change |
|------|--------|
| `apps/web/src/auth.ts` | Moved from package root into `src/`; added `secret: AUTH_SECRET` and `@/` import |
| `apps/web/src/infrastructure/config/env.ts` | **New** — exports `AUTH_SECRET` and `API_BASE_URL` |
| `apps/web/tsconfig.json` | Rewrote to ESNext/bundler module system, added `jsx: react-jsx`, preserved `@/` and `@shared/*` aliases |
| `apps/web/vitest.config.ts` | Fixed alias quoting to match new tsconfig paths |

### `apps/api`
| File | Change |
|------|--------|
| `apps/api/src/auth/jwt.strategy.ts` | Cast `AUTH_SECRET` to `string` for `passport-jwt` |
| `apps/api/src/auth/current-user.decorator.ts` | Narrowed `request` type and return type for type safety |
| `apps/api/src/main.ts` | Changed `bootstrap()` to `void bootstrap()` to suppress unhandled-promise warning |
| `apps/api/src/app.module.ts` | Added root module comment |
| `apps/api/test/unit/auth/jwt-auth.guard.spec.ts` | **New** — full guard test exercising real Passport strategy |
| `apps/api/test/integration/auth.int-spec.ts` | **New** — real HTTP integration test spinning up NestJS |
| `apps/api/test/unit/jest.config.js` | Added `test/unit/**/*.spec.ts` glob, `setupFiles`, fixed quotes |
| `apps/api/test/integration/jest.config.js` | Added `setupFiles` |
| `apps/api/test/setup.js` | **New** — loads `.env.test` via `dotenv` before module init |
| `apps/api/.env.test` | **New** — test-only `AUTH_SECRET` and `CORS_ORIGIN` |
| `apps/api/tsconfig.json` | Added `experimentalDecorators` and `emitDecoratorMetadata` for NestJS |

### Root
| File | Change |
|------|--------|
| `eslint.config.mjs` | Added overrides for `test/setup.js` (CommonJS), NestJS `*.module.ts` decorators, and unsafe-* rules for config files |

---

## Issues Found & Fixes

### 1. Web auth config missing shared secret
**Problem:** `apps/web/auth.ts` had no `secret` field, so its JWTs were signed with a randomly generated secret that the NestJS guard could never verify.

**Fix:** Added `secret: AUTH_SECRET` and created `apps/web/src/infrastructure/config/env.ts` to centralize env var access.

### 2. Web tsconfig broken
**Problem:** `tsconfig.json` had no `jsx` flag (JSX unusable), used CommonJS ESM settings incompatible with `next-auth` (ESM-only), and was missing the `@shared/*` alias.

**Fix:** Rewrote tsconfig to use `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, and both `@/` and `@shared/*` path aliases.

### 3. Auth.ts outside `src/`
**Problem:** `apps/web/auth.ts` lived at the package root but imports used `@/auth`. Next.js doesn't resolve `@/` from the root in all contexts.

**Fix:** Moved to `apps/web/src/auth.ts`.

### 4. Unit tests never ran
**Problem:** `jest.config.js` `testMatch` only matched `src/**/*.spec.ts`, so the guard test in `test/unit/` was silently skipped.

**Fix:** Added `<rootDir>/test/unit/**/*.spec.ts` to `testMatch`.

### 5. Guard test was a no-op
**Problem:** The test instantiated `new JwtJwtStrategy()` directly without registering a Passport strategy, so JWT signature verification never executed.

**Fix:** Rewrote the test to load `AuthModule` (which registers the real `JwtStrategy` via `passport-jwt`) and added a `getResponse` stub the guard needs.

### 6. No env var at module load
**Problem:** `JwtStrategy` read `AUTH_SECRET` at construction time, but tests set env vars *after* the module loaded.

**Fix:** Added `.env.test` + `test/setup.js` loaded via Jest's `setupFiles`.

### 7. Missing auth integration test
**Problem:** ARCHITECTURE §3.1 requires a real JWT verified end-to-end by the NestJS guard.

**Fix:** Added `test/integration/auth.int-spec.ts` spinning up the real NestJS app and hitting `/auth/me` over real HTTP (no mocks), covering valid token, wrong secret, expired token, and missing header.

### 8. Lint failures
**Problem:** `no-require-imports` and unsafe-* rules flagged CommonJS config files and NestJS-decorated modules.

**Fix:** Imported `jsonwebtoken` properly, typed HTTP calls, awaited bootstrap promise, and added repo-level ESLint overrides for NestJS `*.module.ts` and `test/setup.js`.

---

## Test Coverage

### Unit (`apps/api/test/unit/auth/jwt-auth.guard.spec.ts`)
- `JwtStrategy.validate()` parses a validly-signed JWT payload
- `JwtStrategy.validate()` throws on missing required fields
- `JwtAuthGuard` rejects requests with no Authorization header
- `JwtAuthGuard` accepts a validly-signed, unexpired JWT
- `JwtAuthGuard` rejects a JWT signed with the wrong secret
- `JwtAuthGuard` rejects an expired JWT
- `JwtAuthGuard` rejects a payload missing required fields

### Integration (`apps/api/test/integration/auth.int-spec.ts`)
- Real HTTP `GET /auth/me` returns 200 with valid JWT
- Real HTTP `GET /auth/me` returns 401 for wrong secret
- Real HTTP `GET /auth/me` returns 401 for expired JWT
- Real HTTP `GET /auth/me` returns 401 with no Authorization header

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| JWT strategy (not DB sessions) | Serverless Neon compatibility; no DB round-trip per request |
| Shared `AUTH_SECRET` env var | Single source of truth across both apps; never generated independently |
| `passport-jwt` + NestJS `AuthGuard("jwt")` | Standard, well-tested integration; guard runs before route handler |
| Zod validation in `JwtStrategy.validate()` | Enforces `AuthJwtPayload` shape at the NestJS layer before passing to controllers |
| `AUTH_SECRET as string` cast | `process.env` is `string | undefined`; `passport-jwt` needs a non-null string |
| Test setup via Jest `setupFiles` | Ensures `.env.test` loads before any module reads `process.env` |

---

## Environment Requirements

| Environment | `AUTH_SECRET` source |
|-------------|---------------------|
| Development | `.env` file in `apps/web` and `apps/api` (same value) |
| Test | `apps/api/.env.test` (test-secret-for-unit-tests-only) |
| Staging | Injected secret in Railway/Vercel dashboard |
| Production | Injected secret in Railway/Vercel dashboard |

Both `apps/web` and `apps/api` **must** receive the same `AUTH_SECRET` in every environment.
