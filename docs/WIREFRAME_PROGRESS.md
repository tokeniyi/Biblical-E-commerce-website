# Wireframe build progress

Resume point for any session implementing `docs/WIREFRAME_BUILD_SPEC.md`.
Read this first, then the spec.

## Workflow (from the owner)

- One phase at a time, in spec §9 order. Branch `feat/wireframes-phase-N-<name>`, small commits
  (cloud sessions that are assigned a branch, e.g. `claude/…`, use that branch instead).
- **PR base is `main`** from Phase 2 on (Phase 0 went to `claude-code-frontend`).
- Before a PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm --filter web e2e`, all green.
- `gh` is not installed: push, then give the owner the compare link and the PR body
  (`docs/pr/phase-N.md`). The owner opens and merges; never merge.
- Figma wins over the spec on conflict; report every conflict in the PR.
- Don't guess: ambiguities go under "Open questions" below and in the PR.
- A passing test only counts if it exercises the behavior (owner's rule). Verify in the
  browser too.

## Current phase: 3 — Auth & account (PR open, awaiting review)

Phase 2 merged into `main` (PR #17). Branch: `claude/laughing-clarke-g19j49` (session-assigned) → PR into
`main`. PR body: `docs/pr/phase-3.md`.
Next: Phase 4 (Post-purchase: O09–O13; E13, E17, E21, E22).

| Item | Status |
|---|---|
| Shared `account.schema.ts`, `safeReturnTo()` / `loginPath()`, `formatDayMonth()`, cart `mergeConflicts` | done |
| Mock: `identity.ts` (A01–A06), `account.ts` (A07–A09, A12), `orders.ts` (A10/A11, snapshot, reorder), `reviews.ts` (A13), sign-in cart merge | done |
| A01–A14 screens; A14 = `/login?reason=session-expired\|auth-required\|signed-out` | done |
| E03, E04, E09, E10, E11 in the real flow and in `/__dev/states` | done |
| ♡ auto-save after sign-in (`save=SKU` through A01 / A02 → A03) | done |
| Dev: `POST /api/__dev/as` identity/prep presets; `/__dev/screens` A01–A13 presets | done |
| Unit (web 178, shared 71) + Playwright (76: smoke 16 + storefront 23 + checkout 14 + account 23) | done |

### Phase 3 decisions (not covered by the spec)

See `docs/pr/phase-3.md` ("Decisions the spec didn't cover") for the full list. The ones that
affect later phases:

1. Account pages call `requireCustomerPage(returnTo)` and read through `loadAccountData()`
   (`lib/api/account.ts`): E11 / A14 redirects, 404 for not-found (including someone else's), null for E18.
   Client mutations use `signInRedirect()` (`lib/auth-redirect.ts`).
2. Sign-up does not sign in; the emailed verification link does (non-enumerating A02). Verifying an
   email links guest orders placed with it (open question: keep automatic, or explicit in O09?).
3. `withSnapshot()` (`mock-server/services/orders.ts`) applies the "Order BS-10428 snapshot" toolbar to
   reads without mutating the order; delivered snapshot = 12 Oct (return deadline 11 Nov). Use it in O10–O13.
4. `customerOrderDetail().canCancel / canReturn` hold the A11 rules (cancel: processing + paid; return:
   delivered within 30 days). O11/O12 must recheck them on submit.
5. Rate limits and resend cooldowns run on real time (`db.throttle`), not the frozen mock clock. O09's
   60 s resend cooldown should reuse `takeCooldown`.
6. Dates use `formatDayMonth()` from shared (ICU en-GB writes "Sept").
7. Customer carts carry `customerId`; sign-in merges into the account cart (`mergeCartOnSignIn`).

### Phase 2 decisions that still matter

1. New orders continue from BS-10429; the guest order session is the paying browser's cart
   token for 60 minutes (O09 in Phase 4 adds the email-code path).
2. `GET /api/checkout` is the one read for O01–O07 (not chrome; E18 lands on it).
3. Quote drift is one-shot and mutates the catalog (stock/price), so E06 persists until accepted.
4. Checkout controls are disabled until hydration (`useHydrated`): pre-hydration native submits
   would put addresses or card numbers in the URL. Use it for any new form that posts data.
5. The O03 "Save this address" option writes to the customer's address book (A09).

## How the mock tooling works (read before each phase)

- UI imports only `@/lib/api/*`; never `@/mock-server/*`.
- Route handlers wrap with `mockHandler()` (`src/mock-server/http.ts`): latency, network
  faults, error envelope. Pass `{ chrome: true }` for header-level reads (exempt from
  faults so "fail next read" hits the page's data), `{ dev: true }` for `/api/__dev/*`.
- One-shot flags carry a token (`network:fail-read~ab12cd34`); consumption is recorded in
  the store (`db.consumedOneShots`). Reason: Server Components fetch with the browser
  cookie but their Set-Cookie never reaches the browser, so cookie-only clearing failed.
- The store reseeds itself if hot reload brings a seed shape with new collections.
- Dynamic route handlers get their params as the third `mockHandler` argument.
- Storefront pages read through `serverApi()`; `loadViewer()` (`lib/api/viewer.ts`) gives the
  signed-in customer and wishlist for ♡ buttons.
- Listing pages navigate through `ListingProvider` (`components/storefront/listing`), whose
  pending transition drives E16. Use `ListingLink`/`navigate`, not plain links, for facet changes.
- Built screens set `<PageContent screen="C05">`; `/__dev/screens` and the smoke test check it.
- E2E runs against `next build && next start` with `NEXT_PUBLIC_MOCK_TOOLS=1`
  (dev-mode on-demand compiles made assertions time out on this machine).

## Phase 0 decisions (not covered by the spec)

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

Phase 3:

10. Confirm the copy listed in `docs/pr/phase-3.md` ("Copy not in Figma").
11. Sign-up signs in only after email verification (non-enumerating). Keep, or sign in immediately?
12. Verifying an email links guest orders with that address automatically. Keep, or make it explicit (O09)?
13. Lockout: 5 failed sign-ins per email per 15 minutes? Verification links: 24 hours?

Phase 2:

8. Confirm the copy listed in `docs/pr/phase-2.md` ("Copy not in Figma").
9. When is a shipping method unavailable (O04 "with reasons")? No rule in Figma.

Phase 1:

6. C02 "English / Spanish" links to all languages (`language=all`). Or should it be Spanish only?
7. Confirm the invented copy in decision 12, and whether Helpful / Report review need behavior.

Phase 0:

1. Return status order: spec §3.2 (O13) says received → approved → refunded; §5.10 says
   requested → approved → received → refunded. Which is right?
2. Where does the admin header search ("Search admin records…") submit? Rendered
   disabled for now.
3. Footer "Privacy" and "Terms" have no screens: plain text for now. Add pages?
4. ESV rating: spec says 4.8/5 but the histogram (98/19/5/1/1) averages 4.71. Which wins?
5. Spec §11 questions 1–4 (NGN scope, Figma frame location, moderation/staff screens,
   confirming "proposed" rules) are still open.

## Deferred to later phases (owner decisions)

- None open. (Phase 3 delivered the ♡ auto-save after sign-in.)

## Known issues outside this work

- `apps/api` unit Jest config matches `src/**/*.spec.ts` but the guard spec lives in
  `test/unit/`, so CI never runs it. Force-run: 5 pass, 1 fails
  ("accepts a validly-signed JWT": mock context lacks `getResponse`). Not fixed here.
- `apps/web/tsconfig.tsbuildinfo` is tracked and rewritten by every typecheck.
- A13's write route sits under `/account/orders/…`, so the sidebar highlights Orders, not Reviews.
- Cloud sessions: the preinstalled Chromium doesn't match the pinned `@playwright/test`. Run E2E
  with a throwaway config that sets `launchOptions.executablePath` to
  `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` (not committed).
