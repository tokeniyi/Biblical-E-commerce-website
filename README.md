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

Things intentionally left as decisions for you, not assumptions baked in:

- **Fly.io vs Railway** — both deploy workflows have one path commented out;
  pick one and delete the other. Fly.io's GitHub Actions pattern
  (`superfly/flyctl-actions`) is well-documented and stable. Railway's
  CI/CD token auth has had reported rough edges — confirm the current
  working setup in Railway's own docs before depending on it.
- **Exact Vercel CLI flags** — the `vercel deploy`/`vercel build` flags
  shown are current as of this scaffold, but Vercel's CLI has changed
  flags across majors before; double-check against Vercel's CI/CD docs
  when you wire this up for real.
- **Repo secrets** you'll need to create: `VERCEL_TOKEN`, staging/production
  `DATABASE_URL` + `DIRECT_URL` (from Neon), `PAYSTACK_TEST_SECRET`,
  `STRIPE_TEST_SECRET`, `SANITY_WEBHOOK_TEST_SECRET`, and whichever of
  `FLY_API_TOKEN` / `RAILWAY_TOKEN` you end up using.
