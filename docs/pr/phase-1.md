# Wireframes Phase 1: Storefront

**Base:** `claude-code-frontend` · **Branch:** `claude/nifty-hypatia-lgqqdn` · Do not merge until reviewed.

## Summary

The eight customer storefront screens (C01–C08) and their six edge states (E02, E05, E12, E16, E18, E19), built from the Figma frames and backed by the mock server. Every number drawn in the frames is now a server count, not hard-coded copy.

- **Shared contract** (`packages/shared`): listing query helpers (parse/serialize the URL, reset to page 1 on any facet or sort change, "clear all" keeps the search text), listing / product / reviews responses, cart view, wishlist. Variants gain `isbn` and `fontSizePt`; products gain `specs` and `createdAt`.
- **Seed retuned** so the frames render as drawn: 24 English Bibles in stock (C03), 18 results for "bible" (C04), C02's 24 / 18 / 12 / 16 editions, and 124 ESV reviews matching the 98/19/5/1/1 histogram. Still 48 products, 64 variants, 3 drafts and 2 low-stock variants (B02).
- **Mock services:**
  - Catalog: facets, sort, pagination, the sold-out hint.
  - Product detail: drafts are the same 404 as unknown products.
  - Reviews: write eligibility comes from the viewer's delivered orders.
  - Anonymous cart: an httpOnly token cookie, with stock checks that count what's already in the cart.
  - Saved for later: move rechecks stock and price; remove never touches the cart.
  - Wishlist: keyed by SKU, saving twice keeps one entry.
- **Screens:**
  - C01 Home.
  - C02 Category directory (counts come from the server).
  - C03/C04 share one listing module:
    - Facets live in the URL, and Back restores them.
    - Chips are removable.
    - The price range is debounced.
    - Below `md`, filters sit behind a "Filters" toggle.
  - C05 product page:
    - The variant selects drive SKU, price and stock.
    - Quantity is capped at what's available.
  - C07 drawer, on the native `<dialog>`:
    - Focus starts on Close.
    - Focus is trapped while it's open.
    - Closing returns focus to Add to cart.
  - C06 reviews.
  - C08 saved for later, with a confirm before remove.
- **Edge states, in the real flow:**
  - E02: no results, with the query kept.
  - E05: sold out.
  - E12: an unavailable combination stays selected.
  - E16: a loading grid while a change loads.
  - E18: a network error with Retry.
  - E19: 404.
- **Dev tooling:**
  - "Load sample cart" (toolbar, and the C07/C08 rows on `/__dev/screens`) loads the drawn cart: Cart (2) with ESV + NIV, and KJV + NLT saved.
  - `/__dev/states` renders the six states in isolation, each with an "Open in flow" link.

## Checks

- `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm test` ✅ (shared 48, web 111)
- `pnpm --filter web e2e` ✅: 39 tests (the 16 smoke tests + 23 new storefront tests) against `next build && next start`. Ran three times in a row; all green each time.
  - The new tests cover browse, filter, search, variant, add to cart and saved items.
  - Each edge state is reached through the real flow.
  - The drawer test checks that focus can't reach the page behind it.
  - API calls check that the server refuses a draft variant and a sold-out move even when the UI is bypassed.
- Checked by hand in the browser against each Figma frame (C01–C08, E02, E05, E12, E19), and at 375px wide: no horizontal scroll.

## Found while verifying (fixed)

1. **Accessible names had a stray space:** "Move to cart : KJV Large Print Bible". Screen-reader-only suffixes in a `<span>` became a separate text run. Controls now use an `aria-label` that starts with the visible text.
2. **Focus was lost after Add to cart.** Disabling the focused button while the request ran dropped focus to `<body>`, so closing C07 had nothing to return to. The button now stays focusable, and repeat clicks are ignored while it's busy.
3. **Dates rendered as "24 Sept 2026"** (Node's en-GB month). They're now formatted as drawn: "24 Sep 2026".

## What to click to test it

First run `pnpm install`, then `pnpm --filter web dev` and open http://localhost:3000.

1. **Home (C01):** you should see Popular Bibles (ESV, NIV, KJV) and the four category tiles. Click **Browse categories**.
2. **Categories (C02):** By purpose should read 24 / 18 / 12 / 16 editions. Click **Browse ESV**: only ESV cards are shown, and the ESV box is ticked.
3. **Browse (C03):** open http://localhost:3000/categories/bibles.
   - You should see "24 Bibles in stock" and "Showing 1–3 of 24 Bibles".
   - Click **Next ›**, then tick **NIV**: the URL drops `page`.
   - Press Back: the previous filters come back.
   - Remove a chip, then **Clear all filters**.
   - Type a max price: the URL changes once, after you stop typing.
4. **Sold-out hint:** on C03, click **Clear “In stock”**. The count becomes 41, and the NLT Children's Bible appears.
5. **Search (C04):** search `bible` in the header.
   - You should see "18 results for “bible”".
   - Tick **KJV**, then search `large print` in the Search query box: KJV stays ticked.
   - **Clear search** returns home.
6. **E02:** open http://localhost:3000/search?q=spanish+study&translation=ESV&binding=Hardcover. Click **Clear filters**: the query stays.
7. **E16:** Dev tools → **Latency (ms) → 4000**, then tick a translation on C03.
   - "Loading Bibles…" shows with skeleton cards, and the filters stay usable.
   - Set Latency back to 0.
8. **E18:** open http://localhost:3000/search?q=bible&scenario=network:fail-read. You'll see the error; **Retry** loads the results.
9. **Product (C05) → C07:** open the ESV Study Bible.
   - Change **Quantity**: it caps at 12.
   - Click **Add to cart**: the drawer opens with focus on **Close ×**, and the header shows Cart (1).
   - Tab around: focus stays in the drawer. Escape closes it, and focus returns to **Add to cart**.
10. **E12:** on the ESV page, choose Binding **Leather-look** and Print size **Large print**.
    - You should see "Leather-look / Large print — unavailable" and Add to cart disabled.
    - **Select available variant** switches back.
11. **E05:** open http://localhost:3000/products/nlt-childrens-bible. Add to cart is disabled; **Find alternatives** goes to Children's Bibles.
12. **E19:** open http://localhost:3000/products/missing and http://localhost:3000/products/esv-journaling-bible (a draft). Both show the same "We can’t find that page".
13. **Reviews (C06):** click "4.8 / 5 · 124 verified reviews".
    - Filter **4 stars**: you should see "Showing 1–2 of 19 reviews".
    - Signed out you see sign-in guidance.
    - Set Identity → Customer: Jordan Lee and reload: **Write a review** points to BS-10392 (the delivered order).
14. **♡ Save:**
    - Signed out, it links to `/login?returnTo=…`.
    - As Jordan, it saves in place and shows "♥ Saved".
15. **Saved for later (C08):** on `/__dev/screens`, click **Saved for later (loads sample cart)**.
    - KJV → **Move to cart** lands on the KJV page with the drawer open.
    - NLT only offers **View alternatives**.
    - **Remove** asks first; **Keep item** changes nothing.

## Decisions the spec didn't cover

1. `/categories/bibles` is All Bibles, the URL in the C03 frame. Large print is a category built from a variant property and also a C03 checkbox (confirmed: keep both). Family reading = Children's + Devotional, and Gift editions = titles containing "Gift" (confirmed).
2. With no params, a listing uses the drawn defaults (English, In stock).
   - Removing either chip writes `language=all` or `availability=all`.
   - **Clear all** returns to the defaults and keeps `q`.
3. URL formats:
   - `translation=ESV,KJV`
   - `type=study`
   - `price=10-40` (whole dollars)
   - `largePrint=true`

   Sort changes also reset to page 1. A page past the end shows the last page.
4. Products can be in several categories. That's how C02's 24 + 18 + 12 + 16 editions fit inside 48 products.
5. C06 shows 2 reviews per page, as drawn, which differs from the storefront's 3 (`REVIEWS_PAGE_SIZE` in `rules.ts`).
6. A product card shows the first variant that matches the active filters, e.g. the paperback when Binding = Paperback.
7. E16 appears while a filter, sort or page change loads. A first full page load waits for the server instead.
8. The cart and wishlist reads count as page chrome (like the header), so "fail next read" lands on each page's main data.
9. **♡ Save when signed in** saves in place, offering **View wishlist** rather than navigating to A12. Coming back from sign-in via `returnTo` shows the server's true state, "♡ Save", because the tap before sign-in saved nothing. Auto-save after sign-in is deferred to Phase 3 (see below).
10. **Move to cart (C08)** goes to the C07 drawer on that product's page.
11. An add-to-cart failure shows the server's message inline. E06 is the Phase 2 quote check.
12. **Product page links:**
    - The page title is the product name.
    - C05's "See O12 for eligibility" links to Shipping & returns, because O12 needs an order.
13. **E19 "Search Bibles"** jumps to the header search, because `/search` with no query goes home (C04: "Clear search returns C01").
14. Copy that isn't in Figma is kept short:
    - review eligibility guidance
    - "No reviews yet."
    - "You have no saved items."
    - error messages
15. **Helpful (n) · Report review** are plain text, because no behavior is wireframed for them.

## Figma vs spec

- **C03 route:** Figma's URL is `/categories/bibles?…`; the spec says `/categories/[slug]`. They're compatible: `bibles` is a slug.
- **C06 page size:** Figma shows "Showing 1–2 of 124 reviews"; the spec's storefront page size is 3. Figma wins: 2 per page.
- **C02 counts:** 24 + 18 + 12 + 16 = 70 editions, but there are 48 products. Resolved with multi-category products, so the drawn counts are what the server returns.

## Open questions

Resolved by the owner: Family reading / Gift editions rules as proposed; keep large print as both tile and checkbox; auto-save after sign-in deferred to Phase 3.

1. C02's "English / Spanish" currently shows all languages. Should it be Spanish only?
2. Please confirm the copy listed in decision 14, and whether Helpful / Report review need behavior.
3. Still open from Phase 0:
   - return status order
   - where admin search submits
   - Privacy/Terms pages
   - ESV 4.8 vs 4.71
   - spec §11 questions 1–4

## Deferred to a later phase

- **Auto-save after sign-in (Phase 3, with A01).** Carry the tapped SKU through sign-in, save it server-side, and return to the same page showing "♥ Saved" only once the server confirms. Until then, the return trip shows the true unsaved state, and an E2E test covers that.

## Issues found outside this PR (not fixed)

- Everything from Phase 0 still stands: the `apps/api` guard spec never runs in CI, and `tsconfig.tsbuildinfo` is tracked.
- The repo isn't Prettier-formatted (55 existing files differ from `.prettierrc.json`), so I matched the surrounding style rather than reformatting.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012URxuMm6Q6KKUkdnr9TPCU
