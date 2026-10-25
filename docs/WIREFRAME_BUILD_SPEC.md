# Wireframe Implementation Spec — Bible Store

**Audience:** Claude Code, working in this repo.
**Goal:** Implement all 48 wireframed screens, 25 edge-state variants and 4 journey maps as a clickable, testable Next.js app backed by a **mock server that behaves like the real API**, so every workflow and edge case can be exercised and later swapped onto the real NestJS/Prisma API.

**Source of truth:** Figma file `SUDhoGrpRkuNLovJZhEOfP` (`https://www.figma.com/design/SUDhoGrpRkuNLovJZhEOfP/Untitled`). Every screen below lists its Figma node ID. If you have the Figma MCP connected, load the `figma-design-to-code` skill first, then call `get_design_context` per node. **All copy, routes, destination arrows (`→ X##`) and "State & behavior" notes live in text layers inside each frame; treat them as requirements.** This spec summarizes them; Figma wins on conflict.

**Repo state this spec was written against:** commit `9eb66be` (pnpm + Turborepo monorepo; `apps/web` = Next.js 16.3.4 / React 19.1 with an empty `page.tsx`; no Tailwind; `apps/api` = Prisma schema with only `User` + `Transaction` and no Nest `src`; `packages/shared` = Zod schemas for auth/user/transaction; `docs/ARCHITECTURE.md` plans Auth.js (JWT), Paystack/Stripe, Sanity, Meilisearch). Re-verify before relying on this.

---

## 0. Decisions already made by the owner

| Decision | Value |
|---|---|
| Data/back end for this phase | **Mock first, shaped so the real API swaps in** |
| Styling | **Tailwind**, added to `apps/web` |
| Delivery | Claude Code implements in the repo using this spec |

### Decisions made on the owner's behalf (confirm in the first PR description)
1. Mock back end = **Next Route Handlers under `app/api/**`** with an in-memory store, called by the web app through a typed **HTTP client**. This means swapping to NestJS later is a base-URL + handler-removal change, not a rewrite.
2. Mock auth = httpOnly cookie sessions behind a `getSession()` abstraction. **Do not install Auth.js in this phase**; keep the abstraction compatible with `docs/ARCHITECTURE.md` §3.1 (JWT strategy, shared `AUTH_SECRET`).
3. Visual fidelity = **low-fidelity wireframe look** (grayscale, `[ BOOK ]` schematic cover boxes, same copy as Figma). Match structure, copy and behavior, not pixels.

---

## 1. Architecture

### 1.1 Layers (keep strict)

```
apps/web/src/
  app/                       # routes (see §3), route groups below
  components/                # shared modules (§4)
  lib/api/
    client.ts                # typed fetch client = the ONLY thing UI imports
    types.ts                 # re-exports from @your-app/shared
  mock-server/               # DELETE-ME-LATER: everything the real API replaces
    store.ts                 # globalThis singleton in-memory DB
    seed.ts                  # fixtures (§6)
    services/                # catalog, cart, checkout, payments, orders, returns, auth, wishlist, reviews, admin
    scenarios.ts             # scenario flags (§7)
    clock.ts                 # controllable "now"
    outbox.ts                # emails/codes for Dev Inbox
  app/api/**/route.ts        # thin handlers -> mock-server/services
  app/__dev/**               # dev-only pages (§7), gated by env
packages/shared/src/schemas/ # NEW commerce Zod schemas: product, variant, cart, quote, order, payment-intent, return, review, address, discount, content, stock-adjustment, error envelope
```

Rules:
- UI never imports from `mock-server/`. UI talks to `lib/api/client.ts` only.
- Request/response shapes are **Zod schemas in `packages/shared`**, used by both the mock handlers and the client. These are the contract the real Nest API must satisfy later.
- Mock services contain the **business rules** (§5) as pure functions where possible so they can be unit-tested and later ported.
- Server is authoritative for prices, tax, shipping, stock, eligibility, order access (Figma states this on nearly every screen).
- Errors use one envelope: `{ error: { code, message, fieldErrors?, details? } }`. Codes map 1:1 to edge states (§7).
- Persist in-memory store across HMR via `globalThis`; offer `POST /api/__dev/reset` to reseed.

### 1.2 Route groups (from Figma engineering notes)
`(store)`, `(checkout)`, `(auth)`, `(account)`, `admin`. Separate layouts: **StorefrontShell**, **AdminShell**, **AccountNav**. Middleware may redirect, but **every handler/server query re-checks authorization**. Customer session ≠ staff access.

### 1.3 State contract (Figma §6)
Use discriminated states for async UI: `idle | loading | success | empty | error`. Checkout adds `processing | failed | pending-verification | paid`. **Never infer "paid" from a client redirect or optimistic response.** URL owns filters, sort and pagination; cart token persists across login.

### 1.4 Tailwind setup
Add Tailwind to `apps/web`. **Look up the current official install steps for the installed Next.js version; do not rely on memory** (Tailwind's setup has changed across majors). Keep the wireframe palette in CSS variables/theme tokens (grays, one accent for focus, one for destructive). Never rely on color alone for state (a11y).

---

## 2. Proposed business rules (all marked "proposed" in Figma)

Put these in **one config module** (`shared/src/config/rules.ts`) so they are changeable in one place and imported by both mock server and UI copy:

| Rule | Value |
|---|---|
| Currency / locale | USD, English |
| Tax (sample) | 8% of taxable goods (+ recalculated after address and after discount) |
| Shipping | Standard $5.00 (est. 12–14 Oct in sample), Express $12.00 (est. 9–10 Oct) — compute dates relative to mock "now" |
| Storefront page size | 3 per page |
| Password | min 12 chars, paste/password managers allowed |
| Reset link expiry | 30 min, single use |
| Guest verification code | 6-digit, valid 10 min, single use; resend cooldown 60 s; rate limited |
| Cancellation | Paid + **unfulfilled** only; server rechecks atomically |
| Returns | Delivered, within **30 days** of delivery, **unopened**; refund to original method; shipping excluded for partial returns |
| Refund cap | Cannot exceed remaining captured balance; idempotent, no duplicates |
| Review | Delivered purchased item only; one per purchased product; 10–2,000 chars; edits return to moderation; new reviews are **pending** (not public on C06) |
| Low stock | available ≤ 8 |
| Discount | Code unique case-insensitive; % must be 1–100; fixed capped at eligible goods; applies to goods not shipping; combine = off by default |
| Staff roles | `catalog_editor`, `fulfillment`, `content_editor`, `support`, `admin`. Only `admin` issues refunds / manages discount permissions |

---

## 3. Screen inventory

Legend: **→** = destination reference from Figma. "E##" = edge state that must be reachable from that screen.

### 3.1 Customer — Figma section "2. Customer Wireframes"
> ⚠ In the Figma file these 8 frames sit in a frame **outside** Section 2 (node `16:426`, far right on the canvas). Fetch them by node ID, not by walking the section.

| ID | Node | Route | Key behavior |
|---|---|---|---|
| C01 Home | 16:428 | `/` | Header search → C04; Category tiles → C03 slugs; Browse categories → C02; ♡ Save → A12 or A01 (returnTo preserved); cart count in header; footer help → `/help/shipping-returns` |
| C02 Category directory | 16:500 | `/categories` | Links, not filter toggles; by purpose / translation / format / featured; counts from server; copy editable in B13 |
| C03 Browse Bibles | 16:545 | `/categories/[slug]?translation&type&language=en&binding&price&availability=in-stock&largePrint&sort=relevance&page=1` | URL-driven facets/sort/page; **facet change resets page=1**; chips removable; Clear all; debounce price; back restores query; E16 loading, E02 no matches; mention of sold-out NLT → E05 |
| C04 Search results | 16:611 | `/search?q=…` + same facets | `q` preserved with all facets; same listing module as C03; failure → E18; empty → E02; clear search → C01 |
| C05 Product & variant | 16:678 | `/products/[slug]?variant=SKU` | Variant selects (translation/binding/print size) drive SKU, price, stock; qty min 1, max = available (server validates); Add to cart → C07; unavailable combo → disabled + alternatives (E05, E12); ♡ → A12/A01; reviews → C06 |
| C06 Product reviews | 16:738 | `/products/[slug]/reviews?rating=all&sort=helpful&page=1` | Rating histogram, filter, sort, pagination URL-driven; verified badge server-derived; **Write a review → A13 only if eligible else eligibility guidance**; Sign in → A01 |
| C07 Added to cart | 16:789 | `/products/[slug]?cart=added` (drawer) | Overlay; underlying page doesn't navigate; announce success, focus Close, **trap focus**, restore opener on close; View cart → O01, Continue → C05, Checkout → O02; failure → E06 |
| C08 Saved for later | 16:831 | `/cart/saved` | Distinct from wishlist and cart; **Move to cart rechecks stock and price**; unavailable → keep + explain (E05); remove confirm dialog; guest list uses cart token; sign-in merge dedupes by variant SKU |

### 3.2 Checkout & Orders — "3. Checkout & Order Flows"

| ID | Node | Route | Key behavior |
|---|---|---|---|
| O01 Your cart | 16:873 | `/cart` | Qty min 1 / max available; 0 not accepted (explicit Remove with confirm); Save → C08; promo apply → O01/E08; totals = subtotal + shipping + tax − discount; **changes reconcile via E06 before payment** |
| O02 Checkout identity | 16:923 | `/checkout/identity` | Guest and sign-in are equal paths; signed-in users skip to O03; login `returnTo=/checkout/delivery`; cart merge never silently increases quantities; optional Create account → A02 |
| O03 Contact & delivery | 16:965 | `/checkout/delivery` | Guest form vs signed-in saved-address selector (same validation); required `*` fields, error summary, focus first error (E07); "Save address" signed-in only; no coverage → E14 |
| O04 Delivery method | 16:1026 | `/checkout/shipping` | Methods depend on verified address + server rates; recalc total on select (express $12 → $80.04 in sample); unavailable methods shown with reason, not selectable; address edit invalidates rates |
| O05 Payment & review | 16:1069 | `/checkout/payment` | Hosted-field **simulation only**, never store card data; billing same-as-delivery toggle; terms consent required; **final server quote before submit**; idempotency key per attempt; Back allowed before purchase |
| O06 Processing | 16:1125 | `/checkout/processing?intent=…` | Submit locked; no success reference until server confirms; outcome routing: paid → O08, declined → O07, pending/interrupted → E15 status check |
| O07 Payment failed | 16:1163 | `/checkout/payment?status=failed` | Known decline only; preserve cart/contact/address/shipping; clear sensitive values; retry reuses safe flow; "unsure if charged?" → E15 |
| O08 Order confirmed | 16:1202 | `/orders/[id]/confirmation` | Only after verified payment; cart cleared; guest access via secure order-session (not public ID); optional Create account → A02 / Not now → C01 |
| O09 Find guest order | 16:1248 | `/orders/lookup` → `/orders/verify` | Two steps; **generic response** whether or not order exists; code valid 10 min; resend cooldown 60 s; only verified session opens O10/O11/O12; invalid/expired → E13 |
| O10 Track order | 16:1289 | `/orders/[id]/tracking` | Server-authoritative timeline (placed → paid → packed → shipped → delivered); shipped disables cancel (→ O11 ineligible); delivered enables O12 |
| O11 Cancel order | 16:1330 | `/orders/[id]/cancel` | Reason required; destructive confirm; success shows refund requested + links O13; shipped → ineligible variant; changed mid-request → E21 and **retain reason** |
| O12 Request return | 16:1374 | `/orders/[id]/returns/new` | Per-item select, return qty, reason, condition detail, optional attachment placeholder, eligibility checkbox; refund estimate (sample ESV: $39 + $3.12 tax = **$42.12**, shipping $0); eligibility rechecked on submit |
| O13 Return status | 16:1417 | `/orders/[id]/returns/[rma]` | **Mutually exclusive** statuses: received → approved → refunded, or denied (→ E22). Approval ≠ refund. Refunded sample: RMA-204, $42.12, ref RF-204, remaining balance **$30.92**. Full-cancel alternative shows $73.04 and balance $0.00 (don't reuse $42.12) |

### 3.3 Account — "4. Account Flows"

| ID | Node | Route | Key behavior |
|---|---|---|---|
| A01 Sign in | 16:1470 | `/login?returnTo=` | **Safe returnTo only; reject external URLs**; generic error (E09), rate-limited; cart persists/merges; success → returnTo else A07; guest checkout link → O02 |
| A02 Create account | 16:1508 | `/register?returnTo=` | Password policy; marketing opt-in unchecked; → A03 then safe returnTo; guest-order linking needs verified matching email (never by order number alone) |
| A03 Verify email | 16:1553 | `/verify-email?token=` | Variants: pending (resend w/ cooldown, change email), verified success, expired link (resend). Single-use short-lived token. Verification **never blocks guest checkout** |
| A04 Forgot password | 16:1595 | `/password/forgot` | Local format validation; **always generic** response; cooldown |
| A05 Check your email | 16:1628 | `/password/sent` | Same response for registered/unregistered; resend after 60 s; email-link schematic → A06 |
| A06 Set new password | 16:1661 | `/password/reset?token=` | Valid / success / expired variants; submit disabled until token valid; mismatch inline; success invalidates other sessions → A01; expired → E10 |
| A07 Account overview | 16:1699 | `/account` | Protected; cards + sidebar share route inventory; guest orders appear only after verified linking |
| A08 Profile | 16:1744 | `/account/profile` | Dirty-state guard; email change → re-verify (A03); saved / validation variants; historical order snapshots unchanged |
| A09 Addresses | 16:1795 | `/account/addresses`, `/new`, `/[addressId]/edit` | List / form / delete-confirm / empty variants share **AddressForm** with O03; default affects future checkouts only |
| A10 Orders | 16:1858 | `/account/orders?status=all&page=1` | Status filter, search by order #, pagination; unknown/unauthorized id → **non-disclosing** response; empty → E04 |
| A11 Order details | 16:1895 | `/account/orders/[id]` | Read-only paid snapshot; Track → O10; Cancel if eligible → O11; delivered: return O12, refund O13, review A13; shipped disables cancel; Reorder checks stock/price (E06) and never auto-charges |
| A12 Wishlist | 16:1940 | `/account/wishlist` | Keyed by variant SKU, add idempotent; Move to cart validates stock/price, wishlist stays until removed; out-of-stock disabled + alternatives; remove confirm; empty → E03 |
| A13 My reviews | 16:1991 | `/account/reviews`, `/account/orders/[id]/items/[sku]/review` | List / write / pending / edit / delete-confirm variants; ineligible → writing disabled with links |
| A14 Sign in required | 16:2038 | `/login?reason=session-expired&returnTo=` | Variants: signed-out, auth-required, session-expired (E11). Preserve returnTo + non-sensitive draft only; cart survives logout |

### 3.4 Admin — "5. Admin Flows" (shell: "BIBLE STORE / ADMIN", separate `/admin` boundary)

| ID | Node | Route | Key behavior |
|---|---|---|---|
| B01 Staff sign in | 16:2080 | `/admin/login?returnTo=` | Separate from customer auth; optional security-code field; 403 variant → E20; staff session expiry → B01 |
| B02 Overview | 16:2118 | `/admin` | Counts: orders to fulfill, low-stock variants, draft products, recent orders; shortcuts keep their table filter |
| B03 Products | 16:2177 | `/admin/products?q&status&page` | URL-driven; bulk **archive** with confirm (never deletes order history); row → B04 |
| B04 Create/edit product | 16:2226 | `/admin/products/new`, `/admin/products/[slug]/edit` | Save draft allows incomplete; **publish validates every active variant** (unique slug/SKU, nonneg price, required fields); error summary links to fields; unsaved-change guard; publish → B03/C05 |
| B05 Inventory | 16:2285 | `/admin/inventory?stock&page` | on-hand − reserved = available; adjust needs **reason + version check**; preview; immutable reason history; concurrent edit → E25 |
| B06 Orders | 16:2341 | `/admin/orders?payment&fulfillment&page&dates` | Separate payment/fulfillment states; never fulfill unpaid; export is permissioned; row → B07 |
| B07 Order detail | 16:2388 | `/admin/orders/[id]` | Fulfill (carrier + tracking required) → notifies customer, feeds O10; cancel only if unfulfilled; **admin-only refund**, amount ≤ remaining balance, idempotent audit transaction, rechecks status/version; purchased lines immutable |
| B08 Customers | 16:2445 | `/admin/customers?q&page` | Minimal PII; no passwords/tokens/payment details; access logged |
| B09 Customer detail | 16:2485 | `/admin/customers/[id]` | Read-only by default; internal notes (author/time, no payment data); PII view audited |
| B10 Discounts | 16:2528 | `/admin/discounts?status&page` | Status derived from dates + enabled + limits; bulk disable confirm; existing orders unchanged |
| B11 Create/edit discount | 16:2572 | `/admin/discounts/new`, `/[code]/edit` | Validation incl. duplicate code, % 1–100, end > start → E24; saved variant |
| B12 Site content | 16:2629 | `/admin/content?status&page` | List with status; draft never public; preview staff-only |
| B13 Edit content page | 16:2672 | `/admin/content/[slug]/edit` | Plain textarea placeholders (no rich text); save draft → private preview → **publish confirm** → success; version check prevents overwrite; publish revalidates public route |

Public content route: `/help/[slug]` renders **published** content only; drafts 404.

### 3.5 Edge states — "6. States & Edge Cases" (frames are compact extracts, not full pages)

Every state must be **reachable in the real flow** via the scenario system (§7), not only on a gallery page. Also build a dev gallery `/__dev/states` that renders each in isolation.

| ID | Node | Host screen | Trigger | Recovery destinations |
|---|---|---|---|---|
| E01 Empty cart | 16:2731 | O01 | Last item removed / first visit | C03, C08; checkout disabled, announce count 0 |
| E02 No search results | 16:2745 | C04/C03 | Zero matches | Clear filters, edit search, C02 |
| E03 Empty wishlist | 16:2759 | A12 | No saved | C03, A07 |
| E04 No orders yet | 16:2771 | A10 | No linked orders | C01, O09 |
| E05 Product sold out | 16:2784 | C05 | stock = 0 | Add disabled; alternatives C03; wishlist A12/A01 |
| E06 Cart stock/price changed | 16:2798 | O01→O05 | Server quote differs | Accept & update → O01; remove item. Sample: qty 2→1 available, NIV $24→$25 ⇒ $64 + $5 + $5.12 tax = **$74.12**. Payment blocked until accepted |
| E07 Invalid address | 16:2817 | O03/A09 | Required/ZIP invalid | Error summary + inline, focus first invalid |
| E08 Promo invalid/expired | 16:2834 | O01 | Bad/expired/ineligible code | Keep entered code, totals unchanged; variants: not recognized, expired, minimum/category |
| E09 Login error | 16:2850 | A01 | Bad credentials | Generic copy, retain email, clear secrets |
| E10 Reset token expired | 16:2864 | A06 | Expired/used | A04, A01; no enabled fields |
| E11 Session expired | 16:2876 | A14 | Expired on guarded mutation | A01 → returnTo (A11) |
| E12 Variant unavailable | 16:2889 | C05 | Draft/unavailable combo | Offer valid variant; selection stays visible |
| E13 Guest verification invalid | 16:2903 | O09 | Wrong/expired code | Resend, change lookup details |
| E14 Shipping unavailable | 16:2917 | O03/O04 | Unsupported region | Edit address, back to cart; payment blocked |
| E15 Payment declined/uncertain | 16:2931 | O06/O07 | Known decline **or** unknown status (distinct branches) | Known: change method O05. Uncertain: check status → O08/O07/remain O06; **never retry blindly, never two outcomes at once** |
| E16 Loading product grid | 16:2949 | C03/C04 | Fetching | Keep filters, reserve card geometry, `aria-busy`, don't show stale count as final |
| E17 Loading order details | 16:2972 | A11/O10 | Authorized fetch in progress | Not a status or payment confirmation |
| E18 Network error | 16:2994 | C04/A11 | Fetch failed | Retry original route (reads only); payment writes use E15 |
| E19 404 | 16:3006 | any | Unknown slug/route | C04, C02, C01; don't disclose unauthorized order existence |
| E20 403 admin forbidden | 16:3018 | /admin | Customer or insufficient role | B01, C01; hide PII and mutations |
| E21 Cancellation ineligible | 16:3032 | O11 | Shipped before confirm | O10, O12; no refund claimed |
| E22 Refund denied | 16:3044 | O13 | Condition not met | Retain reason; no refund transaction; help link |
| E23 Saved/published success | 16:3057 | A08/B13 | Mutation success | Toast/status announce, **no forced navigation** |
| E24 Discount validation conflict | 16:3068 | B11 | Duplicate code, %>100, dates | Keep fields, summary links, don't publish |
| E25 Inventory edit conflict | 16:3087 | B05 | Version changed (12→11) | Reload & review; reason retained; **no silent overwrite** |

---

## 4. Shared modules (Figma "Shared component / module inventory")

| Module | Used by | Contract |
|---|---|---|
| StorefrontShell / AdminShell / AccountNav | all | Separate layouts; desktop sidebar becomes drawer on mobile |
| ProductCard / VariantSelector / StockNotice | C03–C05, A12, O01 | Variant SKU identity; server price/availability |
| FilterSidebar / Sort / Pagination | C03, C04, C06, admin tables | URL-driven, shareable, reset page on facet change |
| AddressForm / Field / ErrorSummary | O03, A09, billing in O05 | Labels, required markers, inline error IDs (`aria-describedby`, `aria-invalid`), focus first error |
| CartItem / Summary / CheckoutStepper | O01–O08 | Persisted cart; authoritative quote; edit links before submit |
| DataTable / ConfirmDialog / Toast | A09, B03–B13 | Semantic tables; gated actions; pending/success/error mutations; dialog focus trap + restore |

Also: the repeated **order summary** panel (items, subtotal, shipping, tax, discount, total, note) appears on O02–O10; build once.

---

## 5. Cross-cutting behavior (must be implemented, not just rendered)

1. **Cart token:** anonymous cart token cookie; on login, server-side merge, dedupe SKUs, **prompt on conflicts, never silently increase quantity**.
2. **Quote:** one `POST /api/checkout/quote` returns authoritative totals; any drift vs the cart ⇒ E06.
3. **Payment (simulated provider):** create intent with idempotency key → processing → outcome (paid / declined / pending). Outcome is chosen by scenario (§7). Retry after uncertain must **look up the existing intent** first. Order is created/marked paid **only** on server-verified success; cart cleared only then.
4. **Order access:** owner session **or** verified guest session (short-lived, rate-limited). Order ID alone never reveals data; unknown vs unauthorized are indistinguishable.
5. **Safe `returnTo`:** same-origin relative paths only; reject `//`, absolute URLs, `javascript:`.
6. **Account enumeration:** login, forgot-password, guest lookup all return generic results with consistent shape (timing parity best-effort in mock).
7. **Role enforcement:** every `/api/admin/**` handler checks role/permission; UI hides unauthorized actions but never relies on that.
8. **Concurrency:** products/inventory/content/discount edits carry a `version`; mismatch ⇒ conflict error (E25 / E24 / B13 overwrite guard).
9. **Idempotency:** payment intents, refunds, cancellations. Repeat call returns same result, never a second effect.
10. **Order lifecycle** (single state machine in `mock-server/services/orders.ts`):
    `pending_payment → paid/unfulfilled → packed → shipped → delivered`; branches: `cancelled` (from paid/unfulfilled only), `return_requested → approved → received → refunded` or `denied`. Payment status and fulfillment status are **separate fields**.
11. **A11 reviews:** moderation is not wireframed. Provide a **dev-toolbar "Approve pending reviews"** action so pending → published on C06 is testable.
12. **Accessibility:** visible labels, keyboard operation, focus management, live regions for async status/errors, confirm dialogs trap + restore focus, tables semantic. Mobile intent: stack columns, filter drawer, single-column checkout, prioritized table cells or controlled horizontal scroll.

---

## 6. Seed data (match the wireframes so screens render as drawn)

**Products/variants:** ESV Study Bible `ESV-ST-HC` $39.00, 12 avail (on-hand 15, reserved 3) · NIV Everyday Bible `NIV-EV-PB` $24.00, 26 (28/2) · KJV Large Print Bible `KJV-LP-LL` $32.00, 8 (low; 9/1) · NLT Children's Bible `NLT-CH-HC` $22.00, **0** (sold out) · ESV Journaling `ESV-JR-PB` $28.00 draft · ESV leather-look large print `ESV-ST-LL-LP` $49.00 **draft/unavailable** (drives E12). Slugs: `esv-study-bible`, `nlt-childrens-bible`, etc. ESV page: 4.8/5, 124 reviews (98/19/5/1/1), two sample reviews (Taylor M., Sam R.).

**Generate filler** so totals/pagination match: 24 in-stock Bibles in listing, 18 search results for "bible", 48 products, 64 variants, 216 customers, 12 discounts, 9 content records.

**People:** customer Jordan Lee `jordan@example.com` (`cus_jordan`, verified, default address 24 Oak Street, Portland, OR 97205, US) · Maya Gray, Robin Kim (unverified, 1 guest order), Sam Rivers. Staff `alex@store.example` (Admin) + one user per other role.

**Orders:** `BS-10428` ($73.04, placed 7 Oct 2026, Visa 4242; items ESV-ST-HC ×1 + NIV-EV-PB ×1; subtotal 63 + ship 5 + tax 5.04). `BS-10392` ($73.04, placed 12 Sep, delivered 18 Sep — enables A13 review of ESV-ST-HC and NIV review). Others per B02/B06 (`BS-10427`, `BS-10426`, `BS-10425`, `BS-10423`).
> ⚠ Figma shows **BS-10428 in different lifecycle states on different screens** (Processing/unfulfilled in A07/A11/B07/O11; Shipped in O10; Delivered in O12). Treat these as **snapshots**: the dev toolbar has an "Order BS-10428 snapshot" switch (processing / shipped / delivered) plus RMA status (received / approved / denied / refunded; sample `RMA-204`, ESV ×1, $42.12, ref `RF-204`).

**Discounts:** `READ10` 10% off goods, 1–31 Oct 2026, 18/100, active · `WELCOME5` $5 off, 1–30 Nov 2026, 0/200, scheduled · `STUDY15` 15% study Bibles, 1–30 Sep 2026, 44/50, expired.

**Content:** Home, Study Bible category (`/categories/study`), Shipping & returns (`/help/shipping-returns`, draft), Translation guide (`/help/translations`, draft).

**Clock:** fixtures use Oct 2026 dates. `clock.ts` supports "real now" or "freeze at 7 Oct 2026 10:42" (toggle in dev toolbar) so delivery estimates, return deadline (11 Nov) and discount windows behave predictably.

---

## 7. Test tooling: Dev toolbar, scenarios, Dev Inbox

All gated by `NEXT_PUBLIC_MOCK_TOOLS=1` (default on in dev, off in production builds).

### 7.1 DevToolbar (floating panel, every page)
Stored in a `__scenario` cookie read by the mock server; also settable by URL (`?scenario=payment:declined`) and by Playwright via cookie.

| Control | Options | Drives |
|---|---|---|
| Identity | signed out · customer Jordan · unverified user · staff role (catalog / fulfillment / content / support / admin) | A14, E11, E20, role gating |
| Payment outcome | paid · declined · uncertain→paid · uncertain→failed · pending (stays) | O06, O07, E15 |
| Quote drift | none · stock drop · price change · both | E06 |
| Shipping | supported · unsupported region | E14, O04 |
| Promo | normal · force expired · force invalid · ineligible | E08 |
| Latency | 0 / 800 ms / 4 s | E16, E17 |
| Network | ok · fail next read · fail next write | E18 (and proves E15 on writes) |
| Auth tokens | normal · verification expired · reset token expired | A03, A06, E10 |
| Session | normal · expire now | E11, A14 |
| Guest code | normal · force invalid | E13 |
| Order snapshot | processing · shipped · delivered | O10–O13, A11, B07 |
| RMA status | received · approved · denied · refunded | O13, E22 |
| Concurrency | none · force inventory conflict · force discount conflict · force content conflict | E25, E24, B13 |
| Moderation | "Approve pending reviews" button | A13 → C06 |
| Clock | real · frozen at sample date | dates |
| Reset | reseed store | everything |

Scenario flags must be **one-shot where it makes sense** (e.g., "fail next write") and visibly shown in the toolbar so tests aren't confusing.

### 7.2 Dev Inbox `/__dev/inbox`
Lists every "email" the mock server would send (verification link, reset link, guest verification code, order receipt, shipment notice, refund notice) with clickable links/codes. This is how A03, A05→A06, O09 are actually testable.

### 7.3 `/__dev/states`
Gallery rendering E01–E25 in isolation, plus a **route index page** `/__dev/screens` listing all 48 screen IDs → live route (with a sensible fixture/scenario preset) → Figma node link. Doubles as a coverage checklist.

---

## 8. Testing requirements

**Unit (vitest, existing in `apps/web`):** all business rules in §2/§5 as pure functions: quote/tax/discount math, return refund estimate, cancel/return eligibility, safe `returnTo`, order state machine, stock arithmetic, idempotency. Zod schema specs in `packages/shared` (existing pattern in `__tests__`).

**Integration:** route handlers against the in-memory store: auth enumeration safety, order access (owner / verified guest / stranger), role matrix on admin handlers, concurrency conflicts, refund cap.

**E2E (add Playwright):** one spec per journey map, each branch as a test:
1. **Purchase** — guest happy path C01→C02→C03/C04→C05→C07→O01→O02→O03→O04→O05→O06→O08; signed-in path (O02→A01 keep cart→O03 saved address→…→O08); declined → O07 → retry → O08; uncertain → E15 → verified paid → O08 (**assert exactly one order, one charge**); stock/price change → E06 → accept → O05; save for later C08 ↔ C07.
2. **Auth, wishlist, reviews** — A14→A01→A07→A08/A09→A10/A11; register → A03 (via Dev Inbox) → safe returnTo; forgot → A04→A05→A06 (valid) and E10 (expired); signed-out ♡ → A01 → A12 → C07 → O01; review: A11 delivered → A13 write → pending → approve → visible on C06; **external `returnTo` rejected**.
3. **Post-purchase** — O08/A10 → O09 verify (Dev Inbox code) / A11 → O10; cancel eligible → confirm → O13 refund requested; shipped → E21; delivered → O12 → O13 (received → approved → refunded; denied → E22); partial return refund balance math ($42.12 / $30.92).
4. **Admin** — B01→B02→B03→B04 (draft, publish validation errors, publish) → C05 shows new variant; B05 adjust stock → C05 availability; **E25 conflict**; B06→B07 fulfill (carrier+tracking) → O10 shows shipped; cancel / refund (admin only; over-cap rejected; no duplicate) → O13; B10→B11 (E24) → promo works on O01; B12→B13 draft → preview → publish → `/help/shipping-returns` public; support path B08→B09→B07; **customer session gets E20 on /admin**.

**Scenario coverage test:** a single Playwright spec that, for each of E01–E25, applies the scenario/URL preset from §7 and asserts the state's message **and** its recovery link target. Fail if any E## is unreachable.

**A11y:** run axe on every screen in `__dev/screens`; keyboard-only E2E for C07 drawer, confirm dialogs, and checkout.

CI: keep existing workflows green (`pnpm lint` is `--max-warnings 0`; `pnpm typecheck`; `pnpm test`). Add the E2E job to `pr-checks.yml` only if it runs reliably headless; otherwise document `pnpm e2e` locally and open a follow-up.

---

## 9. Build order (one feature branch + PR per phase, per README branching flow)

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 Foundation** | Tailwind; route groups + shells; `lib/api` client; shared commerce schemas; mock-server skeleton (store, seed, clock, outbox, scenarios); DevToolbar; `/__dev/*`; rules config; Playwright + vitest wired | App boots; toolbar works; reset works; `/__dev/screens` lists all 48 IDs (stubs OK) |
| **1 Storefront** | C01–C08; E02, E05, E12, E16, E18, E19 | Browse/filter/search/variant/cart-add/saved flows pass |
| **2 Cart & checkout** | O01–O08; E01, E06, E07, E08, E14, E15 | Purchase journey (all branches) passes |
| **3 Auth & account** | A01–A14; Dev Inbox flows; E03, E04, E09, E10, E11 | Auth/wishlist/review journey passes; returnTo safety tests pass |
| **4 Post-purchase** | O09–O13; E13, E17, E21, E22 | Post-purchase journey passes incl. refund math |
| **5 Admin** | B01–B13; E20, E23, E24, E25 | Admin journey passes; role matrix tests pass |
| **6 Hardening** | a11y pass, scenario-coverage test, README/docs for toolbar + swapping to real API | All 25 E## reachable; axe clean |

Don't start a phase until the previous one's tests are green. Keep PRs reviewable.

---

## 10. Swapping to the real API later (write this up in `docs/WIREFRAME_MOCK.md`)
- Point `lib/api/client.ts` base URL at NestJS; delete `mock-server/` and `app/api/**` mock handlers.
- The real API must satisfy the Zod contracts in `packages/shared`; add Prisma models for products, variants, carts, orders, payments, returns, reviews, addresses, discounts, content, stock adjustments (current schema only has `User` + `Transaction`).
- Replace simulated payment with Paystack/Stripe hosted fields + verified webhooks (`docs/ARCHITECTURE.md` §3.2), keep the same intent/idempotency semantics.
- Replace mock auth with Auth.js JWT per §3.1; keep `getSession()` shape.
- Content (B12/B13) maps to Sanity (§3.3); search (C04) to Meilisearch (§3.6).

---

## 11. Open questions to raise with the owner (don't guess)
1. Is the web app one product for both US-dollar and Nigerian (NGN/Paystack) customers? Figma is **USD/US-only** (US states, ZIP); confirm whether NGN/Nigerian addresses are out of scope for this wireframe phase.
2. Should the Figma customer frames (`16:426`) be moved inside Section 2 so the file is easier to navigate?
3. Review moderation, staff user management and the admin role matrix have no screens: keep as dev-toolbar stubs (current plan), or design them?
4. Confirm the proposed rules in §2 (they're labeled "proposed" in Figma) before they leak into real policy copy.

**Do not:** invent screens or copy not in Figma; add real payment/email integrations; store card data; skip server-side authorization because the UI hides an action.
