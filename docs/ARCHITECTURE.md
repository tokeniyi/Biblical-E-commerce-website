# Architecture Documentation

Audience: any engineer joining this project — frontend, backend, or QA.
Purpose: understand what talks to what, why it's structured this way, and
what must be tested before anything ships.

---

## 1. System Overview

This is a content + commerce platform: a Next.js frontend serving blog,
devotional, and Bible study content (managed in Sanity), with user accounts,
paid content/features via Paystack + Stripe, file uploads, and search.

**Two independently-deployed applications, one shared contract:**

```
apps/web   (Next.js, deployed to Vercel)
apps/api   (NestJS, deployed to Railway or Fly.io)
```

They are separate deployables — not a single Next.js app with API routes —
because the backend needs to run long-lived processes, connect to Meilisearch,
and hold business logic that shouldn't live at the edge. This is also why
**auth is harder here than in a typical Next.js app**: two apps must agree on
who's logged in (see §3.1).

`packages/shared` is the contract between them: Zod schemas and narrowed
TypeScript types. Both apps import from it instead of redefining the same
shapes twice. If you change a payload shape, change it here first.

---

## 2. Service Map

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  apps/web   │◄──────►│   apps/api   │◄──────►│  Postgres   │
│  (Next.js)  │  REST  │   (NestJS)   │ Prisma │   (Neon)    │
└──────┬──────┘        └──────┬───────┘        └─────────────┘
       │                      │
       │ webhook              │ calls out to:
       ▼                      ▼
┌─────────────┐        ┌─────────────┬─────────────┬────────────┐
│   Sanity    │        │  Paystack   │   Stripe    │ Meilisearch│
│    (CMS)    │        │  (webhook   │  (webhook   │  (search   │
└─────────────┘        │  in + API)  │  in + API)  │   index)   │
                        └─────────────┴─────────────┴────────────┘
                              │
                        ┌─────┴──────┬───────────┐
                        │ Cloudinary │  AWS S3    │
                        │  (images)  │ (large     │
                        │            │  files)    │
                        └────────────┴────────────┘

Auth.js sits between apps/web and apps/api — see §3.1.
Resend sends transactional email, triggered from apps/api.
```

---

## 3. Core Domains — Logic, Flow, and Required Tests

Each section below: **what it does → how data flows → what must be tested
and at which tier** (unit = fast/mocked, integration = real dependency in
CI, e2e = full user journey, manual = human QA before release).

### 3.1 Authentication (Auth.js)

**What it does:** Authenticates users on the Next.js side; NestJS must
independently verify that a request is from a legitimately logged-in user,
without sharing a process with Next.js.

**Strategy: JWT (not database sessions).** Decided for two reasons:
1. **Serverless compatibility** — Neon is serverless/decoupled; a
   database-session strategy would mean NestJS hits Neon on every request
   just to check session validity, adding latency and inflating connection
   usage. JWT verification is local — no DB round-trip needed to check
   auth on every request.
2. **Clean separation** — Next.js and NestJS never share session DB state.
   They share exactly one secret: `AUTH_SECRET`. Both sides use it to
   sign/verify the same JWT independently.

**Flow:**
1. User logs in via Auth.js on `apps/web`, configured with
   `strategy: "jwt"`.
2. Auth.js signs a JWT using `AUTH_SECRET` and stores it (typically as an
   httpOnly cookie).
3. `apps/web` attaches the JWT to requests to `apps/api` (as a bearer
   token or forwarded cookie, depending on how you wire the API calls).
4. `apps/api` has a guard that verifies the JWT signature locally using
   the same `AUTH_SECRET` — no call to Auth.js or a shared session store
   required — and rejects anything invalid, expired, or missing before
   the request reaches a protected route.

**Setup requirement:** `AUTH_SECRET` must be identical across `apps/web`
and `apps/api` in every environment (dev, staging, production) — set it
once per environment and inject it as an env var/secret to both apps, not
generated independently by each.

**Tests required:**
- **Unit:** the NestJS guard correctly accepts a validly-signed, unexpired
  JWT and rejects an invalid signature, expired token, or missing token —
  using fixture tokens signed with a test `AUTH_SECRET`, not real Auth.js.
- **Integration:** a real JWT issued by Auth.js in a test environment
  (signed with the actual shared `AUTH_SECRET` for that environment) is
  verified successfully end-to-end by the NestJS guard.
- **E2E / manual:** full login → protected page → protected API call
  journey, including token expiry and logout (confirm an expired/cleared
  token is actually rejected, not just that a valid one is accepted).

---

### 3.2 Payments (Paystack + Stripe)

**What it does:** Two payment providers — Paystack for NGN/regional,
Stripe for international — both need to result in the same internal
transaction record, so the rest of the app never has to know which
provider was used.

**Flow:**
1. Frontend determines provider based on user currency/region.
2. Checkout initiated against the chosen provider's API.
3. Provider sends an async webhook to `apps/api` on payment
   success/failure.
4. Webhook handler verifies the provider's signature, then normalizes the
   payload into one shape and writes to a single `transactions` table.

**Tests required:**
- **Unit:** currency/region → provider routing logic (given a region,
   correct provider is chosen); payload normalization (differently-shaped
   Paystack vs Stripe payloads produce the same internal transaction
   shape).
- **Integration:** webhook signature verification against each provider's
   **test-mode fixtures**, hitting the real NestJS route (not a mocked
   handler) so the actual verification middleware runs. Reject-on-invalid-
   signature must also be tested, not just the happy path.
- **Scheduled (not on every PR):** a periodic job firing real Paystack/
   Stripe sandbox webhooks, to catch drift between stored fixtures and what
   the providers currently actually send.
- **Manual/e2e:** one real test-mode purchase per provider before each
   production release.

---

### 3.3 Content (Sanity CMS)

**What it does:** Blog, devotional, and Bible study content is authored in
Sanity, not the app's own database. Publishing content should update the
live site without a redeploy.

**Flow:**
1. Editor publishes/updates content in Sanity Studio.
2. Sanity fires a webhook to a Next.js on-demand revalidation route.
3. That route re-validates the relevant page(s), so the next visitor gets
   fresh content without waiting for a rebuild.

**Tests required:**
- **Integration:** send a Sanity test webhook payload to the revalidation
  route and confirm it returns 200 **and** actually triggers revalidation
  — not just that the payload parses correctly.
- **Manual:** publish a real content change in a non-production Sanity
  dataset and confirm it appears on a staging page within the expected
  delay.

---

### 3.4 Database Layer (Prisma + Neon)

**What it does:** Postgres is the single source of truth for users,
transactions, and any app-owned data (content lives in Sanity, not here).
Neon is serverless Postgres, which has one non-obvious operational detail:
pooled vs. unpooled connections.

**Flow / setup note:** Prisma's schema uses a **pooled** `DATABASE_URL` for
normal runtime queries and an **unpooled** `DIRECT_URL` for running
migrations. Mixing these up causes migration failures or connection
exhaustion under load — this is a common Neon+Prisma gotcha, not
optional config.

**Tests required:**
- **Integration:** run actual Prisma migrations against a real, ephemeral
  Postgres instance in CI (a service container — not SQLite, not mocks).
  Postgres has behavior Prisma tests need to actually exercise (constraints,
  enum types, cascade behavior).
- **Unit:** any repository/query-building logic that doesn't need a live
  DB can be tested with a mocked Prisma client.

---

### 3.5 File Uploads (Cloudinary + S3)

**What it does:** Images go to Cloudinary, larger files to S3. The backend
never proxies file bytes — it issues a **signed upload URL** and the
client uploads directly to the storage provider.

**Flow:**
1. Client requests an upload URL from `apps/api` for a given file
   type/size.
2. `apps/api` generates a signed, scoped, time-limited URL from the
   Cloudinary or S3 SDK and returns it.
3. Client uploads directly to Cloudinary/S3 using that URL.

**Tests required:**
- **Unit:** the backend correctly generates a signed URL with the right
  scope and expiry, using a mocked SDK response — CI should not actually
  upload real files to Cloudinary/S3 on every run.
- **Manual/e2e:** a real upload through the full flow, done periodically
  (not on every PR) to catch real SDK/credential issues.

---

### 3.6 Search (Meilisearch → possibly Algolia later)

**What it does:** Powers content/product search. Meilisearch is the
current provider; Algolia is a possible future swap if search needs grow.

**Flow:** App writes to a search index on content create/update; queries
go through an internal adapter interface, not directly to the Meilisearch
SDK, so a future provider swap touches one adapter instead of every call
site.

**Tests required:**
- **Unit:** the adapter interface's contract (index, query, delete) is
  tested against a fake/mock implementation.
- **Integration:** at least one test exercises the real Meilisearch
  instance (a service container in CI, same pattern as Postgres) to catch
  issues a mock wouldn't — e.g. actual query relevance/indexing behavior.

---

## 4. Environment Strategy

Every service listed in §2 needs its own dev/staging/production
separation — this project has more moving parts per environment than a
typical app:

| Service | Dev | Staging | Production |
|---|---|---|---|
| Postgres (Neon) | local or dev branch | Neon branch | Neon branch |
| Sanity | dev dataset | staging dataset | production dataset |
| Auth.js | dev config | staging instance | production instance |
| Paystack/Stripe | test keys | test keys | live keys |
| Cloudinary/S3 | dev folder/bucket | staging folder/bucket | production folder/bucket |

**Getting this wrong is the most common way staging data leaks into
production or vice versa** — treat this table as a checklist when setting
up a new environment, not a one-time setup note.

---

## 5. CI/CD Pipeline

```
feature branch --push--> unit tests only (fast, mocked deps)
      |
      v
  Pull Request --opened/updated--> unit + integration tests
      |                             (real ephemeral Postgres +
      |                              Meilisearch service containers)
      v
 merge blocked until both pass
      |
      v
  staging branch --push--> deploy to staging + Prisma migrate
      |                     against Neon staging branch
      v
  manual UAT / client sign-off
      |
      v
  main branch --push--> deploy to production
                          (gated by required reviewer approval)
```

See `.github/workflows/` for the actual pipeline definitions:
`unit-tests.yml`, `pr-checks.yml`, `deploy-staging.yml`,
`deploy-production.yml`.

See `TESTING.md` for test runner configuration and gotchas when adding
packages.

---

## 5a. Development Setup

- **Testing:** `TESTING.md` - runner setup, `passWithNoTests`, adding new test files
- **Linting:** `LINTING.md` - ESLint flat config, per-package requirements, Next.js rules
- **Path Aliases:** `PATH-ALIASES.md` - `@/` and `@shared/` aliases, config per tool
- **Monorepo Structure:** `MONOREPO.md` - package layout, shared contracts, Turbo tasks

---

## 6. Build Sequence

Order components should be built in, each as its own branch, respecting
dependencies so later branches aren't built against assumptions that
change underneath them.

**Sequential foundation — build in this exact order, one merges before the next starts:**

1. **`feature/shared-core-types`** — `packages/shared`: Zod schemas/types
   for User, Transaction, and the Auth JWT payload. Almost everything
   downstream imports from here.
2. **`feature/prisma-schema`** — Postgres schema (users, transactions) +
   migrations, with the pooled/unpooled Neon URL split configured.
3. **`feature/auth-jwt`** — Auth.js (`strategy: "jwt"`) on `apps/web` +
   the NestJS guard on `apps/api`, verifying via shared `AUTH_SECRET`.

**Parallel — once the foundation above has merged, these don't block each other and can be split across team members:**

4. `feature/payments` — Paystack/Stripe routing, webhooks, reconciliation
   into the transactions table.
5. `feature/uploads` — signed upload URL endpoints (Cloudinary/S3).
6. `feature/search` — Meilisearch adapter + implementation.
7. `feature/content-revalidation` — Sanity webhook → Next.js revalidation
   route.

**Then:**

8. `feature/web-*` (one branch per page/flow) — frontend wired against
   the now-real API endpoints. Most parallelization happens here.
9. Staging deploy → client UAT → production deploy, per the pipeline in
   §5.

See each domain's subsection in §3 for the specific tests required before
a given branch's PR can pass `pr-checks.yml`.

---

## 7. Decisions Log

| Decision | Choice | Status |
|---|---|---|
| Repo structure | Monorepo (Turborepo + pnpm workspaces) | Decided |
| Auth provider | Auth.js | Decided |
| Auth.js session strategy | JWT (not database sessions) | Decided — see §3.1 for reasoning |
| Backend hosting | Railway | Decided |
| Search provider | Meilisearch now, Algolia possible later | Decided (with swap path kept open) |

---

## 8. Open Questions For Whoever Picks This Up Next

- Confirm exact dependency versions before first real install — the
  scaffold intentionally uses placeholder versions rather than guessed
  current ones (see scaffold README).
- Railway's GitHub Actions token-auth setup has had reported rough edges
  in the wild (see scaffold README) — confirm the current working pattern
  against Railway's own docs when wiring up `deploy-staging.yml` /
  `deploy-production.yml` for real, rather than trusting the scaffold's
  version unverified.
