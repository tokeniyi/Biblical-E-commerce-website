# Wireframes Phase 2: Cart & checkout

**Base:** `main` (owner decision, 26 Oct 2026: Phase 1 was merged into `main`, so phase PRs now target it) · **Branch:** `feat/wireframes-phase-2-checkout` · Do not merge until reviewed.

## Summary

The cart and checkout screens O01–O08 and their edge states (E01, E06, E07, E08, E14, E15), built from the Figma frames and backed by the mock server. The copy was pulled from Figma frame by frame this time (the Figma connection worked), so it matches the frames rather than the spec summary.

- **Shared contract** (`packages/shared`): a new `checkout.schema.ts` with the checkout view, delivery/shipping/payment inputs, the E06 cart-change shape, the payment-intent view and the order confirmation. Address messages now use the E07 copy ("Enter a street address.", "Use a valid 5-digit ZIP."). `shippingEstimate()` in `rules.ts` gives "12–14 Oct" / "9–10 Oct" from the mock clock.
- **Mock services:**
  - `pricing.ts` (pure): subtotal + shipping + 8% tax on goods after discount − discount. Percent discounts round to the cent; fixed ones are capped at eligible goods; category-scoped codes count only their categories.
  - `checkout.ts` handles:
    - Promo validation: dates, usage limit, category/minimum.
    - E06 change detection and reconciliation.
    - Delivery with a coverage check, and shipping rates.
    - Idempotent payment intents.
    - Order creation, only after verified payment.
    - The O08 access check.
  - On verified payment: the order is created once, stock moves from available to reserved, the purchased lines and checkout details are cleared (saved items stay), the discount use is counted, and the receipt goes to the Dev Inbox.
- **Screens:**
  - O01 cart: −/+ stepper (min 1, max available); Remove asks first (Remove / Save for later / Keep); Save → C08; promo field; summary; "Estimated totals" note.
  - O02 identity: guest and sign-in side by side; signed-in customers skip to O03.
  - O03 contact & delivery: the shared `AddressForm`. Signed in, there's a saved-address choice and "Save this address to my account".
  - O04 delivery method: server rates with estimates; choosing a method saves it and recalculates the total.
  - O05 payment & review: simulated hosted card fields, billing same-as-delivery toggle, required terms consent, final server quote before submit.
  - O06 processing: nothing claims success until the server confirms. Paid → O08, declined → O07, unknown → E15.
  - O07 payment failed (`/checkout/payment?status=failed`): shown only for a verified decline of this browser's intent. The cart and delivery details are kept; the card fields are cleared.
  - O08 order confirmed: shows the guest account prompt only for guest orders.
  - A `CheckoutStepper`, the shared `OrderSummary` panel, and `Field` / `ErrorSummary` / `AddressForm` (spec §4).
- **Edge states, in the real flow:**
  - E01: empty cart. Checkout is disabled, "Cart: 0 items" is announced, and checkout routes send you back to O01.
  - E06: on O01 and O05. Payment is blocked until you accept or remove the affected items; both return to O01.
  - E07: an error summary that links to each field, inline errors (`aria-invalid` + `aria-describedby`), and focus on the first invalid field.
  - E08: expired / not recognized / ineligible. The entered code stays and the totals don't change.
  - E14: on O03, O04 and O05. No methods, payment blocked, the entered address kept.
  - E15: the uncertain branch on O06 (and on O05 when the submit itself fails), plus the known decline. "Check status" looks up the existing intent and never starts a new payment.
- **Dev tooling:**
  - "Quote drift" is now one-shot (see decision 3).
  - The O04–O08 rows on `/__dev/screens` walk the sample cart into a real checkout state (`?stage=delivery|processing|failed|confirmed`).
  - `/__dev/states` renders the six new states.
  - `/api/__dev/state` reports order and payment-intent counts, so tests can assert "exactly one order, one charge".

## Checks

- `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm test` ✅ (web 139: 28 new checkout tests; shared 48)
- `pnpm --filter web e2e`: **51 of 53 passed** against `next build && next start`.
  - All 14 new checkout tests passed, as did every smoke test.
  - The 2 failures were Phase 1 storefront tests ("price inputs are debounced", "large print is its own category"). Neither touches code changed here, and both passed when re-run alone. They look timing-sensitive under load (see "Issues found outside this PR").
- The checkout E2E covers:
  - The guest happy path C05 → C07 → O01 → O08.
  - The signed-in path.
  - Declined → O07 → retry → O08.
  - Uncertain → Check status → paid (one order, one intent).
  - Uncertain → verified failed → O07, and pending staying on O06.
  - A failed submit → E15 → Check status reusing the same idempotency key.
  - E06 on O05 and on O01.
  - E01, Save → C08, E08, E07, E14.
  - O08 returning 404 to another browser.
- Checked in the browser against the production build: O01 renders the Figma copy and numbers ($63.00 / $5.00 / $5.04 / $73.04). The pane couldn't take screenshots this session (the window wasn't drawing), so the visual check is the text check plus the Playwright traces.

## Found while verifying (fixed)

1. **Clicks before hydration were lost, and could leak form data into the URL.** On a slow machine, the O04 radio was clicked before React hydrated: it checked natively and no request was sent. The same timing on O03/O05 would submit the form natively as a GET, putting the address, or the card number, in the query string. Checkout controls now stay disabled until hydration (`useHydrated`), which also blocks Enter-to-submit.
2. **`checkouts` was typed as always present.** Reads for carts with no checkout yet were typed as defined. The type is now `Partial<Record>`.

## What to click to test it

First run `pnpm install`, then `pnpm --filter web dev` and open http://localhost:3000.

1. **O01:** on `/__dev/screens`, click **Your cart (loads sample cart)**. You should see ESV + NIV, Min 1 · Max 12 / 26, and Total $73.04.
   - **+** on NIV: the total becomes $98.96.
   - **Remove** on ESV: the dialog opens with focus on **Keep**.
2. **E08:** enter `STUDY15` → "! This code has expired. No discount was applied.", and the code stays. `NOPE` → "Code not recognized.". `read10` → "Promo READ10 applied.", total $66.24.
3. **Checkout → O02 → Continue as guest → O03:** clear Address line 1, type ZIP `97`, then Continue. You should see "Check 2 fields", and focus lands on Address line 1. Fix both and continue.
4. **O04:** you should see Standard 12–14 Oct and Express 9–10 Oct ("If chosen: … = $80.04"). Pick Express: the summary total updates. Then **Continue to payment**.
5. **O05:** card `4242 4242 4242 4242`, `12 / 30`, `123`; tick the terms; **Pay $73.04**. You land on O08 for BS-10429, and the header shows Cart (0). The receipt is in `/__dev/inbox`.
6. **Declined:** Dev tools → Payment outcome → declined, then pay again from a new sample cart. You should land on O07, with your details kept and the card fields empty.
7. **E15:** Payment outcome → uncertain-paid. Pay, and O06 shows "Network uncertain". **Check status** → O08. `/api/__dev/state` shows one new order and one new intent.
8. **E06:** on O01, raise ESV to 2 and go through to O05. Set Dev tools → Quote drift → both and reload.
   - You should see "Only 1 available", "$25.00 current price", "After accepting: … = $74.12", and Pay disabled.
   - **Accept & update** → O01 at $74.12.
9. **E14:** Shipping → unsupported, then continue from O03. You should see "We can’t ship to this address" with the address kept. O04 has no methods, and Pay is disabled on O05.
10. **Signed in:** Identity → Customer: Jordan Lee. **Checkout** skips O02; O03 has "Default: Jordan Lee, 24 Oak Street" selected.

## Decisions the spec didn't cover

1. **PR base is `main`** from this phase on (your decision; `claude-code-frontend` stops at Phase 0).
2. **New order numbers continue from the seed:** the first checkout creates BS-10429. BS-10428 stays the seeded sample (it opens on O08 for Jordan).
3. **Quote drift is one-shot and changes the catalog itself:**
   - It leaves one fewer than the first line's quantity in stock, and adds $1 to the second line's price.
   - With ESV ×2 + NIV ×1 that is exactly the Figma E06 sample.
   - It's one-shot because re-applying after "Accept" would loop forever. E06 then stays until the customer accepts or removes, as it would after a real sale or reprice.
4. **One read for every checkout page:** `GET /api/checkout` returns the cart, the quote, E06 changes, delivery details, coverage and rates. It is not page chrome, so "fail next read" lands on it (E18).
5. **Summary totals before reconciling:** when E06 is pending, the summary keeps showing what the customer saw. The E06 panel shows the "after accepting" total.
6. **Shipping before a choice:** before a method is chosen, totals use Standard as the estimate (O01 shows "Shipping $5.00"). An empty cart ships nothing.
7. **Card data never leaves the browser.** The simulated hosted fields send only a token naming the brand and last four (`sim_visa_4242`). The idempotency key lives in `sessionStorage` for the attempt, so "Check status" after a failed submit reuses it.
8. **Payment resolves when the status is read:** the simulated provider settles on the first status read. Uncertain outcomes read as `pending` until **Check status**. The outcome is fixed when the intent is created, so changing the toolbar mid-payment doesn't change it.
9. **Guest order session:** the browser that paid (its httpOnly cart token) may open the O08 confirmation for 60 minutes. Anyone else, and that browser afterwards, gets the same 404 as a missing order. The owner's session always works.
10. **O07 needs a verified decline:** `?status=failed` shows O07 only when this browser's intent is actually declined; otherwise it's O05.
11. **Promo edge cases:**
    - Scheduled codes (WELCOME5 before 1 Nov) and disabled codes read as "Code not recognized.", so upcoming offers don't leak.
    - A code that reached its usage limit reads as expired.
12. **Save → C08 navigates to C08,** following the Figma arrow, rather than staying on O01.
13. **Address edits:** an address edit keeps the chosen method. Both methods are always available in the mock, so nothing needs invalidating.
14. **Address book:** "Save this address to my account" adds the address to Jordan's address book (A09 in Phase 3). It's only offered for a new address.
15. **Alternative payment** is shown but disabled on O05/O07: no flow is wireframed for it.

## Copy not in Figma (please confirm)

- **E08 ineligible:**
  - "This code applies only to Study Bibles. No discount was applied."
  - "This code needs at least $X of eligible items. No discount was applied."
  - "This code doesn’t apply to the items in your cart. No discount was applied."
- **E06:** "None available" (stock dropped to 0) and "Review the changes above before checking out." (under the disabled Checkout).
- **E01:** "Add an item first." (Figma: "[ Disabled — add an item first ]").
- **O01:** "Promo READ10 applied." with **Remove code**.
- **E15:** "Payment is still pending. Contact help if this continues." (Figma's note: "Pending → remain O06; contact help if prolonged").
- **O05 card errors:** "Enter a card number.", "Enter a valid card number.", "Use MM / YY.", "This card has expired.", "Enter the security code.", "Enter the 3 or 4 digit code.", "Enter the name on the card.", "Agree to the Terms to continue."
- **Email field:** "Enter an email address." / "Enter a valid email address."

## Figma vs spec

- **O08 progress line:** Figma's O08 shows "✓ Identity → ✓ Delivery → ✓ Payment → ✓ Confirmation" (four steps, no Method), while O02–O07 show five. Rendered as drawn.
- **E07 summary vs inline wording:** Figma uses "is required" / "is invalid" in the summary but different inline wording ("Enter a street address."). Both are used, as drawn.
- **E06 trigger:** the spec says "any drift ⇒ E06". Figma places it at "O01 → O05 final quote validation". It's shown on both, and payment is refused server-side either way.

## Open questions

1. Confirm the copy listed above.
2. **Unavailable shipping methods.** O04 should list them "with reasons, not selectable", but nothing in Figma says when a method is unavailable. The code supports it (`available` / `reason`); the mock never triggers it. Is there a rule, such as Express not shipping to AK/HI?
3. **Sign-in during checkout.** A01 (Phase 3) is still a stub, so "Sign in → A01 → O03" goes to the stub. The signed-in path is tested with the dev Identity switch. Cart merge on sign-in comes with A01.
4. Still open from earlier phases:
   - return status order
   - admin search
   - Privacy/Terms pages
   - ESV 4.8 vs 4.71
   - C02 "English / Spanish"
   - spec §11 questions 1–4

## Issues found outside this PR (not fixed)

- **Flaky Phase 1 tests.** Two storefront tests are timing-sensitive under full-suite load: "price inputs are debounced" typed "25" but the URL caught "-5". Both pass alone.
- **Intermittent `next build` failures on this machine:** `ENOENT` on a file it just wrote under `.next/static`, and once a worker that failed to start (`0xc0000142`). A clean retry passed each time.
- Everything from earlier phases still stands: the `apps/api` guard spec never runs in CI, `tsconfig.tsbuildinfo` is tracked, and the repo isn't Prettier-formatted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
