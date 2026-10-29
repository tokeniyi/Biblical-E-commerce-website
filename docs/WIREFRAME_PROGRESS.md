# Wireframe build progress

Resume point for any session implementing `docs/WIREFRAME_BUILD_SPEC.md`.
Read this first, then the spec.

## Workflow (from the owner)

- One phase at a time, in spec §9 order. Branch `feat/wireframes-phase-N-<name>`, small commits.
- **PR base is `main`** from Phase 2 on (Phase 0 went to `claude-code-frontend`).
- Before a PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm --filter web e2e`, all green.
- `gh` is not installed: push, then give the owner the compare link and the PR body
  (`docs/pr/phase-N.md`). The owner opens and merges; never merge.
- Figma wins over the spec on conflict; report every conflict in the PR.
- Don't guess: ambiguities go under "Open questions" below and in the PR.
- A passing test only counts if it exercises the behavior (owner's rule). Verify in the
  browser too.

## Current phase: 2 — Cart & checkout (PR open, awaiting review)

Phase 1 merged into `main` (PR #16). **From Phase 2 on, PR base is `main`** (owner, 26 Oct 2026);
`claude-code-frontend` stops at Phase 0.
Branch: `feat/wireframes-phase-2-checkout` → PR into `main`. PR body: `docs/pr/phase-2.md`.
Next: Phase 3 (Auth & account: A01–A14; Dev Inbox flows; E03, E04, E09, E10, E11).

| Item | Status |
|---|---|
| Shared `checkout.schema.ts`; E07 address copy; `shippingEstimate()` | done |
| Mock: `pricing.ts` (pure quote math), `checkout.ts` (promo, E06, delivery, rates, intents, orders, O08 access) | done |
| O01–O08 with CheckoutStepper, OrderSummary, AddressForm/Field/ErrorSummary | done |
| E01, E06, E07, E08, E14, E15 in the real flow and in `/__dev/states` | done |
| Dev: quote drift one-shot; `/__dev/screens` O04–O08 stage presets; dev state order/intent counts | done |
| Unit (web 139, shared 48) + Playwright (53: smoke 16 + storefront 23 + checkout 14) | done |

### Phase 2 decisions (not covered by the spec)

See `docs/pr/phase-2.md` ("Decisions the spec didn't cover") for the full list. The ones that
affect later phases:

1. New orders continue from BS-10429; the guest order session is the paying browser's cart
   token for 60 minutes (O09 in Phase 4 adds the email-code path).
2. `GET /api/checkout` is the one read for O01–O07 (not chrome; E18 lands on it).
3. Quote drift is one-shot and mutates the catalog (stock/price), so E06 persists until accepted.
4. Checkout controls are disabled until hydration (`useHydrated`): pre-hydration native submits
   would put addresses or card numbers in the URL. Use it for any new form that posts data.
5. The O03 "Save this address" option writes to the customer's address book (A09, Phase 3).

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

- **Phase 3: auto-save after sign-in from ♡ Save.** The owner wants it, because the tap is the
  user's intent. Carry the pending SKU through A01 (e.g. `returnTo` plus a `save=SKU` param, or
  a short-lived server-side intent), validate it server-side after sign-in, save idempotently,
  then return to the same page showing "♥ Saved". If the save fails (draft, unknown SKU),
  return showing "♡ Save" with an explanation. Never show a save the server didn't confirm.
  Update the "after sign-in, returnTo…" E2E test, which today asserts nothing was saved.

## Known issues outside this work

- `apps/api` unit Jest config matches `src/**/*.spec.ts` but the guard spec lives in
  `test/unit/`, so CI never runs it. Force-run: 5 pass, 1 fails
  ("accepts a validly-signed JWT": mock context lacks `getResponse`). Not fixed here.
- `apps/web/tsconfig.tsbuildinfo` is tracked and rewritten by every typecheck.
- Cloud sessions: the preinstalled Chromium doesn't match the pinned `@playwright/test`. Run E2E
  with a throwaway config that sets `launchOptions.executablePath` to
  `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` (not committed).
