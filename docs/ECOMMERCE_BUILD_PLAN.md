# Full E-commerce Build: Plan

Branch: `claude/elegant-keller-j0yvpj` (kept separate from `main`).
Goal: turn the grayscale wireframe storefront into a complete, high-fidelity, clickable
e-commerce website with demo imagery, finish the customer flows that were still stubs, and add
**consented navigation analytics** that the team can use to improve UX.

The mock back end (`src/mock-server`, Next route handlers) stays the system of record, so every
flow below works end to end without external services. Swapping to NestJS later is unchanged
(see `docs/WIREFRAME_BUILD_SPEC.md` §10).

---

## 1. Starting point (verified on 22 Nov 2026)

| Area | State before this branch |
|---|---|
| Storefront C01–C08 (home, categories, listing, search, product, reviews, added-to-cart, saved) | Built, wireframe look |
| Cart & checkout O01–O08 (cart, identity, delivery, shipping, payment, processing, failed, confirmation) | Built, wireframe look |
| Auth A01–A06 (sign in, register, verify, forgot/reset password) | **Stubs** |
| Account A07–A13 (overview, orders, order detail, wishlist, addresses, profile, reviews) | **Stubs** |
| Post-purchase O09–O13 (lookup, tracking, cancel, returns) | **Stubs** |
| Admin B01–B13 | **Stubs** (shell + role gating only) |
| Analytics / navigation tracking | **None** |
| Tests | web 139 unit, shared 48 unit, Playwright 53 |

Outbound image CDNs (Unsplash, Picsum) are blocked from the build container, so **demo pictures
are generated locally as SVG** (book covers per product, lifestyle hero/category art). They are
deterministic, need no network, and are easy to swap for real photography later.

---

## 2. UX research summary

Sources that were checked (search results, not full paywalled reports):

- [Baymard: Product Page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
  avoid horizontal tabs for key product sections, make free/flat shipping hard to miss, signpost
  hidden gallery images.
- [Baymard: Product List UX](https://baymard.com/blog/current-state-product-list-and-filtering) and
  [PLP best practices](https://baymard.com/blog/product-listing-page-plp-ux): show an
  **applied-filters overview**, combine variants into one list item, show enough thumbnails.
- [Baymard: Checkout flow UX](https://baymard.com/blog/checkout-flow-ux-optimization),
  [progress indicators](https://baymard.com/blog/progress-indicator-ui-ux): make **guest checkout
  the most prominent option** (62% of sites fail this; ~18–19% abandon over forced accounts);
  stepper must match the real steps, be visible, and let users go back; **never introduce new
  costs at the review step**.
- [Christianbook Bible store](https://www.christianbook.com/page/bibles?event=FOOT) facets by
  Translation, Binding, Format, Color; [Cambridge Bibles ordering help](https://bibleshelp.cambridge.org/hc/en-gb/articles/13437410809874-How-do-I-place-an-order)
  selects version → edition → binding in sequence; [Tyndale's buying guide](https://www.tyndale.com/stories/How-to-Buy-a-Bible-Online?amp)
  suggests translation first. → Variant selector order **Translation → Binding → Print size**
  (already the case) plus a translation guide link.
- Cookie consent ([CookieYes](https://www.cookieyes.com/blog/e-commerce-cookie-consent-banner),
  [Usercentrics](https://usercentrics.com/knowledge-hub/cookie-banner-best-practice/),
  [Smashing: Privacy UX](https://smashingmagazine.com/2019/04/privacy-ux-better-cookie-consent-experiences),
  [FTC paper on banner nudging](https://www.ftc.gov/system/files/ftc_gov/pdf/linfarronatofradkin.pdf)):
  granular categories, **Accept and Reject with equal prominence**, no dark patterns, a
  non-blocking slide-in on mobile, and a way to change the choice later.

### Design decisions taken from the research

1. Header: announcement bar (shipping/returns promise visible on every page), logo, prominent
   search, account / wishlist / cart icons with count badge, category nav.
2. Product cards: real cover image, rating stars + count, price, stock badge (low stock / sold
   out), quick wishlist toggle; whole card clickable.
3. Listing: keep the URL-driven facets; applied-filter chips at top (already present, restyled).
4. Product page: large gallery with labelled thumbnails, price + stock + shipping promise near the
   Add to cart button, sections stacked (no tabs), trust row (returns, secure checkout).
5. Checkout: guest checkout first and equal to sign-in, visible stepper, sticky order summary,
   no new costs on the review step (already enforced by server quote).
6. Visual identity: warm paper background, deep ink-navy text, oxblood primary, gilt accent;
   serif display face (Fraunces) for headings and Inter for UI. Calm and reverent, not flashy,
   in keeping with `docs/DESIGN.md`.

---

## 3. Scope of work

### 3.1 Visual system
- Replace wireframe tokens in `globals.css` with the brand palette (same token names so every
  existing component restyles at once), add `font-display`, radius and shadow tokens.
- Restyle primitives in `components/ui/styles.ts` (buttons, panels, fields, status boxes).
- Load Inter + Fraunces with `next/font/google`.

### 3.2 Demo imagery
- `lib/imagery.ts`: deterministic cover palette per product (by translation/binding/style).
- `BookCover` renders an SVG book (spine shadow, gilt title, translation badge, leather texture).
- `HeroArt` / `CategoryArt` SVG scenes for home and category tiles.

### 3.3 Storefront & checkout polish
- New StorefrontShell header + mobile menu, rich footer with newsletter and cookie settings link.
- Home: hero, value props, category tiles with art, bestsellers, "find your translation" band,
  testimonials, newsletter.
- Restyle listing, product page, cart, checkout and confirmation using the new primitives.

### 3.4 Finish customer flows
- **Auth**: sign in (A01, with safe `returnTo`), register (A02), sign out; API
  `POST /api/session/login`, `POST /api/account/register`.
- **Account**: overview (A07), order history (A10), order detail with status timeline (A11),
  wishlist (A12) with move-to-cart, profile (A08) read view.
- Account API: `GET /api/account/orders`, `GET /api/account/orders/[id]`, `GET /api/wishlist`
  (exists), `DELETE /api/wishlist/[sku]`.

### 3.5 UX analytics (navigation tracking)
Privacy-first, first-party, consent-gated.

| Piece | Detail |
|---|---|
| Consent | `cookie_consent` cookie (`analytics=granted|denied`, versioned). Banner with **Accept analytics** / **Reject** at equal weight + **Customize**. Footer "Cookie settings" reopens it. Nothing is tracked or set until granted; Global Privacy Control / Do-Not-Track = treated as denied by default. |
| Identifiers | `_bs_vid` visitor id (first-party cookie, 180 days) and `_bs_sid` session id (30-min idle window), both random UUIDs, set only after consent; deleted when consent is withdrawn. |
| Events | `page_view` (path, referrer path, title), `page_leave` (time on page, max scroll %), `click` (elements with `data-track` + all links: target, text), `search` (query, results count), `add_to_cart`, `wishlist_add`, `checkout_step`, `purchase`, `filter_change`, `rage_click` (≥3 clicks in 600 ms on one spot), `dead_click` (click on non-interactive element), `js_error`. Device class + viewport bucket. **No PII**: query strings are stripped except `q`, emails never captured, form values never captured. |
| Transport | Batched queue, `navigator.sendBeacon` on page hide, `fetch(keepalive)` otherwise, max 50 events/batch. |
| Ingest | `POST /api/analytics/events`, validated by a shared Zod schema, rejects when consent cookie is not granted, caps events per session. Stored in the mock DB (`analyticsEvents`). |
| Insights | `GET /api/admin/analytics?range=7d` (staff only): KPIs (sessions, visitors, pages/session, avg time, bounce rate, conversion), **funnel** (home/listing → product → add to cart → checkout → purchase with drop-off), top pages, **navigation paths** (top from→to transitions), exit pages, searches with zero results, rage/dead-click hot spots, scroll depth by page, device split, and **automated UX recommendations** generated from thresholds. |
| Dashboard | `/admin/insights` (B-series admin shell), plus a summary card on `/admin`. Seeded with labelled demo traffic so it is meaningful on first load; filter "Live only" excludes demo data. |
| Data rights | `DELETE /api/analytics/me` erases the visitor's events; triggered when consent is withdrawn. |

### 3.6 Admin
- Admin sign-in page (B-login) works with seeded staff accounts.
- Dashboard (B01) with sales KPIs + analytics summary; Insights page; Orders list (B06) read view.

---

## 4. Testing plan

| Layer | What |
|---|---|
| Unit (vitest) | consent parsing; analytics schema; sanitisers (PII stripping); aggregation: funnel, paths, bounce, rage clicks, recommendations; imagery palette determinism; login/register services; account order access. |
| Route (vitest) | ingest rejects without consent, accepts with consent; admin analytics requires staff; login/register/me endpoints. |
| E2E (Playwright, prod build) | Full journey: home → category → product → add to cart → cart → guest checkout → paid confirmation; sign in → account → orders → order detail; register; wishlist; consent banner accept/reject behaviour (no events without consent); tracked events appear on `/admin/insights`. Existing 53 specs updated for new copy. |
| Manual | Screenshots desktop + mobile of every main page, keyboard walk of banner and header. |

Exit criteria: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the Playwright suite pass.

---

## 5. Out of scope (left for follow-ups)
- Real payment providers, real email, real CMS/search (unchanged plan in `ARCHITECTURE.md`).
- Post-purchase O09–O13 and admin editing screens B03–B13 beyond the read views above remain stubs.
- Real photography: SVG art is a placeholder.

---

## 6. Delivered (22 Nov 2026)

| Area | Result |
|---|---|
| Visual system | Brand tokens in `globals.css` (paper / ink / oxblood / gilt), Fraunces + Inter via `next/font`, restyled primitives in `components/ui/styles.ts`, icon set `components/ui/Icon.tsx`. |
| Demo imagery | `components/storefront/BookCover.tsx` (front / back / spine / pages SVG views per product), `SceneArt.tsx` (hero and category illustrations), palette logic in `lib/imagery.ts`. |
| Storefront | New header (announcement bar, search, account/wishlist/cart badge, category nav), footer (newsletter, help, cookie settings), home page, product cards, product page with gallery + trust row, help/policy pages (`/help/shipping-returns`, `/help/translations`, `/help/privacy`, `/help/terms`). |
| Accounts | `/login`, `/register`, `/admin/login`, `/account` (overview), `/account/orders`, `/account/orders/[id]` (timeline), `/account/wishlist`, `/account/profile`, `/account/addresses`, `/account/reviews`. |
| Admin | `/admin` overview (sales tiles, recent orders, low stock, top UX findings), `/admin/insights` dashboard. |
| Analytics | Shared contract `packages/shared/src/schemas/analytics.schema.ts`; consent + tracker in `src/lib/analytics/*` and `src/components/analytics/*`; ingest, erase and report routes under `src/app/api/analytics/*` and `src/app/api/admin/analytics`; aggregation and recommendations in `src/mock-server/services/analytics.ts`; seeded demo traffic in `analytics-demo.ts`. |
| Tests | Unit: web 173 (+34: analytics, account), shared 48. Playwright: 61 (+8 in `e2e/journey.e2e.ts`); existing specs updated for the new copy. |

### How to try it

```bash
pnpm install
pnpm --filter web dev        # http://localhost:3000, mock tools on in dev
```

1. Accept the cookie banner, browse a category, open a product, add to cart, check out as a guest
   (card `4242 4242 4242 4242`, any future expiry, any CVC).
2. Sign in at `/admin/login` as `alex@store.example` / `wireframe-password`, open **UX insights**,
   tick **Live visitors only** to see just your session (funnel, paths, clicks, scroll).
3. Customer account: `jordan@example.com` / `wireframe-password`, or register a new one.
4. Footer → **Cookie settings** → Reject withdraws consent and erases your recorded events.

### Known limitations
- Analytics events live in the in-memory mock store (reset with the dev toolbar); the real API
  needs an `analytics_events` table with the same shape and a retention job.
- Demo traffic is synthetic and clearly flagged (`demo: true`); exclude it with the dashboard toggle.
- Post-purchase (O09–O13), address editing and admin editing screens (B03–B13) are still stubs.
