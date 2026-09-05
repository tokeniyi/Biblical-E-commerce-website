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

**Flow:**
1. User logs in via Auth.js on `apps/web`.
2. Auth.js issues a session (JWT or database session — confirm which mode
   before building the NestJS guard, they verify differently).
3. `apps/web` attaches the session token to requests to `apps/api`.
4. `apps/api` has a guard that verifies the token independently (JWT
   verification or a shared session store lookup) before allowing access
   to protected routes.

**This is the fiddliest integration point in the whole system** — it's two
separate codebases agreeing on identity with no shared runtime. Get the
verification mechanism agreed and documented before either side is built
against assumptions.

**Tests required:**
- **Unit:** the NestJS guard correctly accepts a validly-signed/valid
  session and rejects an invalid, expired, or missing one — using fixture
  tokens, not real Auth.js.
- **Integration:** an actual token issued by Auth.js in a test environment
  is verified successfully end-to-end by the NestJS guard.
- **E2E / manual:** full login → protected page → protected API call
  journey, including session expiry and logout.

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

---

## 6. Decisions Log

| Decision | Choice | Status |
|---|---|---|
| Repo structure | Monorepo (Turborepo + pnpm workspaces) | Decided |
| Auth provider | Auth.js | Decided |
| Backend hosting | Railway or Fly.io | **Open — pick one before building deploy workflows for real** |
| Search provider | Meilisearch now, Algolia possible later | Decided (with swap path kept open) |

---

## 7. Open Questions For Whoever Picks This Up Next

- Confirm Auth.js session mode (JWT vs database session) — this determines
  how the NestJS guard is implemented.
- Finalize Railway vs Fly.io before the deploy workflows are un-commented
  for real use.
- Confirm exact dependency versions before first real install — the
  scaffold intentionally uses placeholder versions rather than guessed
  current ones (see scaffold README).
