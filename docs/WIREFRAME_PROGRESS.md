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

## Current phase: 1 — Storefront (PR open, awaiting review)

Phase 0 merged into `claude-code-frontend` (PR #15).
Branch: `claude/nifty-hypatia-lgqqdn` (the session's assigned branch) → PR into `claude-code-frontend`.
Next: Phase 2 (Cart & checkout: O01–O08; E01, E06, E07, E08, E14, E15).

| Item | Status |
|---|---|
| Shared contracts: listing query helpers, listing/product/reviews responses, cart view, wishlist | done |
| Seed retuned so every drawn count is a server count (24 / 18 / C02 24·18·12·16 / 124 reviews) | done |
| Mock services: catalog, cart + saved-for-later, wishlist, reviews + eligibility | done |
| C01 Home, C02 Category directory | done |
| C03 / C04 listing module (facets, sort, pagination, chips, debounced price) | done |
| C05 product & variant, C07 added-to-cart drawer | done |
| C06 product reviews, C08 saved for later | done |
| E02, E05, E12, E16, E18, E19 in the real flow and in `/__dev/states` | done |
| Dev: "Load sample cart" (toolbar + `/__dev/screens` form) | done |
| Unit/integration (shared 48, web 111) + Playwright (38: smoke 16 + storefront 22) | done |

### Phase 1 decisions (not covered by the spec)

1. `/categories/bibles` is All Bibles (the Figma C03 URL). Category slugs: `study`, `devotional`,
   `children`, `journaling`, `large-print` (a variant property), plus the C02 collections
   `family-reading` and `gift-editions` (membership rules proposed, see open questions).
2. Absent listing params mean the drawn defaults (English, In stock). Removing those chips writes
   `language=all` / `availability=all`; "Clear all" returns to the defaults and keeps `q`.
3. URL formats: `translation=ESV,KJV`, `type=study`, `price=10-40` (whole dollars), `largePrint=true`.
   Sort changes also reset to page 1. A page past the end shows the last page.
4. Products can sit in several categories, which is how C02's 24/18/12/16 fit 48 products.
   Filler 14–19 are titled "Edition" (so "bible" finds 18), 20–35 are sold out, 36–39 are Spanish.
5. C06 shows 2 reviews per page (`REVIEWS_PAGE_SIZE`), as drawn; 122 filler reviews make the
   histogram real. The stored 4.8 average stays as drawn (open question 4).
6. A product card shows the first variant that matches the filters.
7. E16 shows while a facet/sort/page change loads (client transition). A first page load waits
   for the server instead.
8. `GET /api/cart` and `GET /api/wishlist` are page chrome (no injected faults), so
   "fail next read" lands on each page's main data (E18).
9. ♡ Save when signed in saves in place and shows "♥ Saved · View wishlist"; signed out it links
   to `/login?returnTo=…`; an expired session goes to `/login?reason=session-expired&returnTo=…`.
10. C08 "Move to cart" lands on the C07 drawer on that product's page.
11. Add-to-cart failures show the server message inline (E06 is the Phase 2 quote check).
12. Copy not in Figma, kept minimal: review eligibility guidance, "No reviews yet.",
    "You have no saved items.", add-to-cart and move errors.
13. C05's "See O12 for eligibility" links to `/help/shipping-returns` (O12 needs an order).
14. E19's "Search Bibles" jumps to the header search; `/search` without `q` redirects to C01.
15. Helpful (n) · Report review are plain text: no behavior is wireframed.

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

Phase 1:

6. Family reading and Gift editions (C02 featured collections) have no category in Figma.
   Proposed: Family reading = children + devotional; Gift editions = titles containing "Gift".
7. C02 "English / Spanish" links to all languages (`language=all`). Or should it be Spanish only?
8. Is large print a category (C01 tile) or a facet (C03 checkbox)? Both work today.
9. Confirm the invented copy in decision 12, and whether Helpful / Report review need behavior.
10. After signing in from ♡ Save, should the item be saved automatically (Phase 3)?

Phase 0:

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
- Cloud sessions: the preinstalled Chromium doesn't match the pinned `@playwright/test`. Run E2E
  with a throwaway config that sets `launchOptions.executablePath` to
  `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` (not committed).
