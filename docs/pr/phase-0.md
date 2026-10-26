# Wireframes Phase 0: Foundation

**Base:** `claude-code-frontend` · **Branch:** `feat/wireframes-phase-0-foundation` · Do not merge until reviewed.

## Summary

The groundwork for the clickable wireframe (spec `docs/WIREFRAME_BUILD_SPEC.md` §9, Phase 0). No real screens yet: every wireframed route renders a stub that names its screen.

- **Shared contract** (`packages/shared`): commerce Zod schemas (product/variant, cart, quote, order, payment intent, return, review, address, discount, content, stock adjustment, session, error envelope) and `config/rules.ts` with the Figma "proposed" rules. Money is integer cents.
- **Web toolchain:** Tailwind v4 (`@tailwindcss/postcss`, per the current Next.js guide), zod, Playwright. Fixed the web tsconfig (no `jsx` setting, so every `.tsx` failed typecheck) and the NextAuth route's broken `@/auth` import.
- **Mock server** (`apps/web/src/mock-server`, to be deleted when the real API lands): in-memory store seeded to the spec's counts (48 products, 64 variants, 216 customers, 12 discounts, 9 content records) plus the named fixtures, a clock frozen at 7 Oct 2026 10:42 UTC, an outbox, and scenario flags.
- **Typed client** (`src/lib/api/client.ts`): the only thing UI imports; validates every response with Zod and maps errors to codes (including simulated network failures, E18).
- **Shells** from Figma C01 / A07 / B02: StorefrontShell, AccountNav sidebar, separate AdminShell. Route groups `(store)`, `(checkout)`, `(auth)`, `(account)`, `admin/(console)`.
- **DevToolbar** on every page: identity (signed out, Jordan, unverified, each staff role), all 12 scenario flags, expire session, approve reviews, clear scenario, reset store. Active flags are always visible.
- **Dev pages:** `/__dev/screens` (all 48 screens with live links and Figma nodes), `/__dev/states` (E01–E25 list), `/__dev/inbox`.
- **`?scenario=` presets** on any URL are stored in the cookie (`src/proxy.ts`).
- **Separate commit:** pre-existing `apps/api` lint errors fixed (`ef68d22`), with no behavior change. Easy to drop if you prefer.

## Checks

- `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm test` ✅ (shared 35, web 53)
- `pnpm --filter web e2e` ✅ 16 tests against `next build && next start`. They check results the server can observe: that the identity changes what renders, the one-shot behavior, that reset really reseeds, and that all 48 routes serve their screen.
- Checked by hand in the browser, which found a real bug the unit tests had missed (below).

## Bug found while verifying

With `network:fail-read` set, **every** page load kept failing. The header's server-side fetch used up the one-shot flag, but its clearing `Set-Cookie` never reaches the browser. The unit test only inspected the handler's own response, so it passed anyway. Fixed in `7ca6429`:
- One-shot flags now carry a token, and the store records which tokens have been consumed.
- The header session read is exempt from injected faults.
- There's a test that replays the stale cookie.

## What to click to test it

First run `pnpm install`, then `pnpm --filter web dev` and open http://localhost:3000.

1. **Home:** you should see "BIBLE STORE", the search box, "Account | Wishlist | Cart (0)", the nav, and the footer. The **Home** nav item is underlined/bold.
2. **Navigation:** click each nav link (Categories, Study Bibles, Devotional, Children, Help) and the Cart link. Each one should change the URL and show the screen ID ("C02 / Category directory", and so on).
3. **Search:** type `bible` in the header search and press Enter. You should land on `/search?q=bible` showing "C04 / Search results".
4. **Dev tools** (bottom right):
   - Set **Identity → Staff: admin (Alex)**, then open http://localhost:3000/admin. The header should read **"Staff: Alex · Admin"**.
   - Click **Sign out**. You should land on `/admin/login`.
5. **Scenario flags:**
   - Set **Payment outcome → declined**. A `payment:declined` chip and "Dev tools · 1 active" should appear.
   - Reload; the chip should still be there.
   - Click **Clear scenario**; the chip should disappear.
6. **URL presets:** open http://localhost:3000/cart?scenario=promo:expired. The URL should change to `/cart` and a `promo:expired` chip should appear.
7. **Expire session:**
   - Set Identity → Customer: Jordan Lee, then click **Expire session now**.
   - The toolbar should show "Session: expired".
   - http://localhost:3000/api/session should return `"expired": true`.
8. **Reset store:** click **Reset store**. Identity should go back to "Signed out" and the flags should clear.
9. **Account / admin sidebars:**
   - Open `/account` and `/admin`.
   - Narrow the window below 768px. Each sidebar should become an "Account menu" / "Admin menu" disclosure.
10. **Dev pages:**
    - On `/__dev/screens`, click any of the 48 rows. Rows with a preset, like O10 "Track order", should also set their flag.
    - Also open `/__dev/states` and `/__dev/inbox` (it should be empty).

## Decisions the spec didn't cover

1. Money is integer cents (matches the existing `TransactionSchema`).
2. Shipping ETAs are Standard = now + 5–7 days and Express = now + 2–3 days, worked out from the Figma samples.
3. Figma's arrow annotations (`→ C04`, `Cart (2) → O01`) are rendered as real links, not shown as text. Screen IDs appear in the stub headings.
4. The clock defaults to frozen at the sample date, so dates and discount windows match the frames.
5. `/__dev` lives in `app/%5F_dev`, because Next treats `_folder` as private.
6. Route groups: `/cart` is in `(checkout)`, `/cart/saved` in `(store)`, and order pages O08–O13 in `(store)`. Checkout uses the storefront shell until Phase 2.
7. Sidebars become a `<details>` menu on mobile.
8. Staff names other than Alex are placeholders. Every seeded account shares one mock password, which is in `seed.ts`.
9. Only BS-10428 and BS-10392 are seeded. The other order IDs only have totals in Figma, so they're left for Phase 5.
10. One-shot scenario flags carry a token, e.g. `network:fail-read~ab12cd34`. A hand-set cookie without a token fires once per store reset.
11. E2E runs on a production build. `next dev` compiles each route on first hit, which made assertions time out on this machine.
12. `apps/web/AGENTS.md` and `CLAUDE.md` are generated by `next dev` 16 and recreated on every run, so I committed them.

## Figma vs spec

- **B02** shows a fulfillment status **"On hold"** (BS-10427) that spec §5.10 doesn't have. Figma wins, so `on_hold` is added to the shared enum.

## Open questions

1. The spec gives two orders for return statuses: §3.2 (O13) received → approved → refunded, and §5.10 requested → approved → received → refunded. Which one is right?
2. Where should the admin header search submit? It's disabled for now.
3. Footer **Privacy** and **Terms** have no screens. They're plain text for now; do you want pages for them?
4. The ESV rating says **4.8/5**, but the histogram 98/19/5/1/1 averages **4.71**. Which number should the page show?
5. Spec §11 questions 1–4 are still open: NGN scope, the location of the Figma customer frames, moderation/staff screens, and confirming the "proposed" rules.

## Issues found outside this PR (not fixed)

- `apps/api`: the unit Jest config matches `src/**/*.spec.ts`, but `jwt-auth.guard.spec.ts` lives in `test/unit/`, so CI never runs it. Force-run, 5 tests pass and "accepts a validly-signed JWT" fails, because the mock context has no `getResponse`. The 4 "rejects" tests would pass for any thrown error.
- `apps/web/tsconfig.tsbuildinfo` is tracked and gets rewritten by every typecheck. It should probably be untracked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
