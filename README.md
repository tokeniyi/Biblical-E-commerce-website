# Project scaffold

Monorepo skeleton (pnpm workspaces + Turborepo) matching this branching and
testing flow:

```
feature branch  --push-->        unit-tests.yml        (fast, mocked deps)
      |
      v
   Pull Request  --opened/updated--> pr-checks.yml      (unit + integration,
      |                                                   real ephemeral
      |                                                   Postgres)
      v
  merge blocked until both pass
      |
      v
   staging branch --push--> deploy-staging.yml          (Vercel + API host +
      |                                                   Prisma migrate
      |                                                   against Neon
      |                                                   staging branch)
      v
   manual UAT / sign-off
      |
      v
   main branch --push--> deploy-production.yml          (same, production
                                                           secrets, gated by
                                                           a required
                                                           reviewer on the
                                                           "production"
                                                           GitHub environment)
```

## Structure

- `apps/web` — Next.js (App Router) frontend
- `apps/api` — NestJS backend
  - `test/unit` — fast, mocked-dependency tests (`pnpm --filter api test`)
  - `test/integration` — real-Postgres tests, run in CI against a service
    container (`pnpm --filter api test:integration`)
- `packages/shared` — Zod schemas + narrowed types shared between web and api,
  so both apps import one source of truth instead of duplicating shapes
- `.github/workflows` — the four workflows in the diagram above

## Before this is real

This scaffold has placeholder dependency versions (`"latest"` or approximate
semver ranges) rather than pinned exact versions — run `pnpm up --latest` (or
check npm) once you actually scaffold `apps/web` with `create-next-app` and
`apps/api` with `nest new`, rather than trusting the versions written here.

Decided:

- **Backend hosting: Railway.** The deploy workflows call the Railway CLI
  directly (`railway up --service=...`). **Verify this actually works in
  a dry run before trusting it** — real users have reported
  `RAILWAY_TOKEN` auth failing with "Unauthorized" in CI even with a
  correctly-set secret. If it fails for you, check Railway's current docs
  for the up-to-date working pattern before assuming the scaffold is wrong.
- **Auth.js session strategy: JWT**, not database sessions — chosen so
  NestJS never has to hit Neon just to check session validity, and so
  `apps/web`/`apps/api` only share one secret (`AUTH_SECRET`) instead of
  session DB state. See `docs/ARCHITECTURE.md` §3.1 for the full flow.

Still left as decisions for you, not assumptions baked in:

- **Exact Vercel CLI flags** — the `vercel deploy`/`vercel build` flags
  shown are current as of this scaffold, but Vercel's CLI has changed
  flags across majors before; double-check against Vercel's CI/CD docs
  when you wire this up for real.
- **Repo secrets** you'll need to create: `VERCEL_TOKEN`, `AUTH_SECRET`
  (same value in both apps, per environment), staging/production
  `DATABASE_URL` + `DIRECT_URL` (from Neon), `PAYSTACK_TEST_SECRET`,
  `STRIPE_TEST_SECRET`, `SANITY_WEBHOOK_TEST_SECRET`, `RAILWAY_TOKEN`,
  `RAILWAY_STAGING_SERVICE_ID`, `RAILWAY_PRODUCTION_SERVICE_ID`.
