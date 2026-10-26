# Wireframe build progress

Resume point for any session implementing `docs/WIREFRAME_BUILD_SPEC.md`.
Read this first, then the spec.

## Workflow (from the owner)

- One phase at a time, in spec §9 order. Branch `feat/wireframes-phase-N-<name>`, small commits.
- **PR base is `claude-code-frontend`** (not `main`; the spec and auth work live there).
- Before a PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm --filter web e2e`, all green.
- `gh` is not installed: push, then give the owner the compare link and the PR body
  (`docs/pr/phase-N.md`). The owner opens and merges; never merge.
- Figma wins over the spec on conflict; report every conflict in the PR.
- Don't guess: ambiguities go under "Open questions" below and in the PR.
- A passing test only counts if it exercises the behavior (owner's rule). Verify in the
  browser too.

## Current phase: 0 — Foundation (PR open, awaiting review)

Branch: `feat/wireframes-phase-0-foundation` → PR into `claude-code-frontend`.
Next: Phase 1 (Storefront: C01–C08; E02, E05, E12, E16, E18, E19).

| Item | Status |
|---|---|
| Shared commerce schemas + `config/rules.ts` + tests | done |
| Web toolchain (tsconfig JSX/bundler, NextAuth import, Tailwind v4, zod, Playwright) | done |
| Route groups + StorefrontShell / AccountNav / AdminShell (Figma C01/A07/B02) | done |
| `lib/api` typed client (Zod-validated) + `serverApi()` | done |
| Mock server: store, seed, clock, outbox, scenarios (one-shot tokens) | done |
| `/api/session`, `/api/__dev/*` | done |
| DevToolbar | done |
| `/__dev/screens` (48), `/__dev/states` (25, list only), `/__dev/inbox` | done |
| `?scenario=` URL presets (`src/proxy.ts`) | done |
| Stub page for every wireframed route | done |
| Vitest unit tests (web 53, shared 35) | done |
| Playwright smoke suite (`apps/web/e2e`) | done |
| Pre-existing api lint errors (separate commit `chore(api)`) | done |

## How the mock tooling works (read before Phase 1)

- UI imports only `@/lib/api/*`; never `@/mock-server/*`.
- Route handlers wrap with `mockHandler()` (`src/mock-server/http.ts`): latency, network
  faults, error envelope. Pass `{ chrome: true }` for header-level reads (exempt from
  faults so "fail next read" hits the page's data), `{ dev: true }` for `/api/__dev/*`.
- One-shot flags carry a token (`network:fail-read~ab12cd34`); consumption is recorded in
  the store (`db.consumedOneShots`). Reason: Server Components fetch with the browser
  cookie but their Set-Cookie never reaches the browser, so cookie-only clearing failed.
- The store reseeds itself if hot reload brings a seed shape with new collections.
- E2E runs against `next build && next start` with `NEXT_PUBLIC_MOCK_TOOLS=1`
  (dev-mode on-demand compiles made assertions time out on this machine).

## Decisions (not covered by the spec)

1. Money is integer cents everywhere (matches existing `TransactionSchema.amountMinorUnits`).
2. Shipping ETAs: Standard = now + 5–7 days, Express = now + 2–3 days, derived from the
   Figma samples (7 Oct → 12–14 Oct / 9–10 Oct).
3. `/__dev` lives in `app/%5F_dev` (Next treats `_folder` as private).
4. Figma destination annotations (`→ C04`, `→ O01`) are rendered as real links, not copy;
   screen IDs appear in stub headings ("C01 / Home").
5. Clock defaults to **frozen** at 7 Oct 2026 10:42 UTC so samples render as drawn.
6. Fulfillment status `on_hold` added (Figma B02 shows "On hold"; spec §5.10 lacks it).
7. `/cart` lives in route group `(checkout)`, `/cart/saved` in `(store)`; order pages
   O08–O13 in `(store)`; checkout uses the storefront shell until Phase 2's stepper.
8. Sidebars collapse to a `<details>` menu below `md` (spec: "drawer on mobile").
9. Seeded staff names other than Alex are placeholders (Casey, Frankie, Corey, Sky);
   seeded password for every account is in `src/mock-server/seed.ts`.
10. Orders seeded now: BS-10428, BS-10392 only. BS-10427/26/25/23 wait for Phase 5
    (their line items are not specified; B02 shows only totals).

## Open questions (for the owner)

1. Return status order: spec §3.2 (O13) says received → approved → refunded; §5.10 says
   requested → approved → received → refunded. Which is right?
2. Where does the admin header search ("Search admin records…") submit? Rendered
   disabled for now.
3. Footer "Privacy" and "Terms" have no screens: plain text for now. Add pages?
4. ESV rating: spec says 4.8/5 but the histogram (98/19/5/1/1) averages 4.71. Which wins?
5. Spec §11 questions 1–4 (NGN scope, Figma frame location, moderation/staff screens,
   confirming "proposed" rules) are still open.

## Known issues outside this work

- `apps/api` unit Jest config matches `src/**/*.spec.ts` but the guard spec lives in
  `test/unit/`, so CI never runs it. Force-run: 5 pass, 1 fails
  ("accepts a validly-signed JWT": mock context lacks `getResponse`). Not fixed here.
- `apps/web/tsconfig.tsbuildinfo` is tracked and rewritten by every typecheck.
