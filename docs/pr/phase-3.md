# Wireframes Phase 3: Auth & account

**Base:** `main` · **Branch:** `claude/laughing-clarke-g19j49` (the branch this session was assigned, instead of `feat/wireframes-phase-3-…`) · Do not merge until reviewed.

## Summary

This PR builds the customer account screens A01–A14 and their edge states E03, E04, E09, E10 and E11 from the Figma frames, backed by the mock server. All copy was pulled from Figma frame by frame. The Dev Inbox now receives real verification and reset emails, so A03 and A05 → A06 can be tested end to end.

- **Shared contract** (`packages/shared`):
  - `account.schema.ts`: sign-in, sign-up, verification, reset, profile, saved address, overview, the A10 query (parsed from the URL), A11 detail, reorder, wishlist items, A13 list and form.
  - `config/return-to.ts`: `safeReturnTo()` (same-origin relative paths only) and `loginPath()`.
  - `formatDayMonth()`: a shared date formatter (see "Found while verifying").
  - The cart view now carries `mergeConflicts`.
  - Reviews carry the `orderId` that made them eligible.
- **Mock services:**
  - `identity.ts`:
    - Sign-in gives one generic E09 answer and is rate limited per email.
    - Sign-up never reveals whether an email already has an account.
    - Single-use verification and reset links.
    - 60 s resend cooldowns.
    - A password reset signs the account out everywhere.
  - `account.ts`: A07 counts, A08 profile (a new email must be verified again), A09 address book, A12 wishlist items.
  - `orders.ts`: the customer's own orders only, with the toolbar's BS-10428 snapshot applied. Covers A10 filters, A11 actions and Reorder.
  - `reviews.ts`: A13 eligibility, pending on submit and on edit, and delete. The stored rating summary follows publish and unpublish.
  - `cart.ts`: the sign-in cart merge and the O01 prompt that settles it.
- **API:**
  - `/api/auth/*`: login, register, verification, verify-email (and resend), password forgot and reset.
  - `/api/account/*`: overview, profile, addresses, orders, reorder, review form, reviews, wishlist.
  - `DELETE /api/wishlist/[sku]` and `POST /api/cart/merge`.
  - Every account handler checks the session again: E11 when it has expired, A14 when signed out, and a 404 for another customer's records.
- **Screens:**
  - **A01:** sign in with generic E09, "Keep me signed in", returnTo, and a ♡ SKU carried through. A14 uses the same route with `reason=session-expired | auth-required | signed-out`.
  - **A02 → A03:** create an account, then verify it with the emailed link (pending, verified and expired variants).
  - **A04 → A05 → A06:** reset the password (valid, success and E10 variants).
  - **A07–A13:** each one asks for a customer session and keeps itself as the returnTo.
  - **Shared helpers:** `PasswordField` (Show/Hide), `UnsavedChangesGuard`, `AuthFrame` with the "Customer account boundary" panel, and `requireCustomerPage()` / `loadAccountData()` for Server Components.
- **Deferred owner decision, done:** a ♡ tapped while signed out is saved after sign-in. The tap's SKU travels as `save=SKU` through A01, or through A02 → A03, and the server saves it idempotently.
  - On success the customer comes back to "♥ Saved".
  - If the edition can't be saved, the page says so (`?wishlist=not-saved`) and still shows "♡ Save".
  - The old "heart truly unsaved" E2E test now asserts the save.
- **Edge states:** all five are reachable in the real flow and render in `/__dev/states`.
  - E03: empty wishlist.
  - E04: no account orders.
  - E09: login error.
  - E10: reset link no longer valid.
  - E11: session expired on a guarded page or save. A non-sensitive draft (A08 profile, A13 review) is restored after signing in again.
- **Dev tooling:**
  - `POST /api/__dev/as?identity=…&prep=expire|reset-link&next=…` signs in as a toolbar identity, then redirects to `next`.
  - The A01–A13 rows on `/__dev/screens` use it, and so do the in-flow links for E03, E04, E09 and E11.
  - Jordan's seed now matches A07 and A12: 4 saved Bibles, and 1 published NIV review from BS-10392.

## Checks

- `pnpm lint` ✅ · `pnpm typecheck` ✅
- `pnpm test` ✅: web has 178 tests (39 new: identity, account, account routes), shared has 71 (23 new: returnTo, account schemas, `formatDayMonth`).
- `pnpm --filter web e2e`: **76 of 76 passed** against `next build && next start`.
  - The new `account.e2e.ts` has 23 tests. It covers:
    - A14 → A01 → A07.
    - E09.
    - External returnTo rejected.
    - O02 → A01 → O03 with the saved address.
    - The sign-in merge prompt.
    - Sign-out (the cart survives).
    - A02 → A03 through the Dev Inbox → verified, the link used only once, and the existing-email case.
    - The A03 expired link.
    - A04 → A05 → A06 → other sessions signed out → sign in with the new password → E10.
    - E10 by scenario.
    - E11 on A11, and on an A08 save with the draft restored.
    - A08 validation, saved, and the unsaved-changes guard.
    - A09 with E07, default and delete.
    - A10 filters and E04.
    - A11: a 404 for another customer's order, shipped disables cancel, Reorder → O01.
    - Signed-out ♡ → A01 → ♥ Saved → A12 → C07 → O01.
    - A12 remove → E03.
    - A13: write → pending → approve → visible on C06, plus not-delivered and delete.
  - Smoke and storefront tests were updated for the guarded account pages, Jordan's seeded wishlist and the ♡ auto-save.
  - The two Phase 1 tests that were timing-sensitive last time passed in this run.
- Checked in the browser against the production build: A01, A02, A07, A08, A09, A10, A11, A12, A13 and A14 match the frames' layout and copy.

## Found while verifying (fixed)

1. **"Sept" instead of "Sep".** ICU's en-GB short month for September is "Sept", so "Delivered 18 Sep" rendered as "18 Sept". The new `formatDayMonth()` is now used for A10, A11, A13, O08 and the shipping estimates. Phase 1's review dates already worked around this.
2. **A10's returnTo carried the default query.** A signed-out visit to `/account/orders` came back to `/account/orders?status=all&page=1`. The plain path is kept now.

## What to click to test it

First run `pnpm install`, then `pnpm --filter web dev` and open http://localhost:3000. Every seeded account's password is `wireframe-password`.

1. **A14 → A01:** open `/account/orders`. You should see "Please sign in to continue" with links to sign in, create an account and check out as a guest.
   - **Sign in** → "Returning to: Your orders".
   - Wrong password: E09 "Email or password is incorrect"; the email stays and the password is cleared.
   - `jordan@example.com` signs in and lands on A10 (BS-10428 Processing · Paid, BS-10392 Delivered · 18 Sep).
2. **A07:** Overview shows 1 saved address · Portland, Oregon · Default, 2 orders · 1 processing, and 4 saved Bibles · 1 review.
3. **A08:** set Email to `jordan@` and Save: "! Enter a valid email address." and focus moves to the field.
   - Click **Orders** in the sidebar: "Leave without saving?" appears.
   - Fix the email and Save: "✓ Saved", and the page stays.
4. **A09:** **Add address**, ZIP `97`, Save: the E07 summary appears.
   - Complete the form, tick default, Save: "✓ Address saved".
   - **Delete** asks first, with focus on **Keep**.
5. **A11:** on BS-10428, Dev tools → Order BS-10428 snapshot → shipped, then reload: cancellation becomes unavailable.
   - **Reorder (stock check)** goes to O01.
6. **A13:** on BS-10392 (delivered), click **Review ESV Study Bible**, write a review and Submit. It shows as "Pending" and is not on C06.
   - Dev tools → **Approve pending reviews**: it now appears on `/products/esv-study-bible/reviews`.
7. **A12:** three cards and the out-of-stock NLT panel.
   - **Move to cart** opens C07 and the item stays in the wishlist.
   - Remove all four to reach E03.
8. **Signed-out ♡:** sign out (A14 signed-out variant; `Cart (n)` is unchanged), open `/categories/bibles?translation=NLT` and tap **♡ Save** on NLT Thinline Bible.
   - Sign in as Jordan: you're back on the listing with "♥ Saved".
9. **A02 → A03:** `/register?returnTo=/checkout/delivery`, then create an account. You land on A03 "Check you@…".
   - **Resend email** shows the 60 s countdown.
   - Open the link in `/__dev/inbox`: "✓ Email verified" with **Continue to Checkout / Delivery**.
   - Opening the link again shows the expired variant.
10. **A04 → A06:** **Forgot password** with any email gives the same A05.
    - For Jordan, open the inbox link and set a new password: "Password updated", and other sessions are signed out.
    - Opening the link again shows E10.
11. **E11:** sign in as Jordan, open `/account/orders/BS-10428`, then Dev tools → **Expire session now** and reload.
    - You should see A14 "Your session has expired" with the return destination.
    - **Sign in again** brings you back to the order.
12. **Merge prompt:** sign in as Jordan in one browser with NIV ×2 in the cart.
    - In a private window, add NIV ×1 and sign in.
    - O01 says "We kept quantity 1 from this visit. Your account cart had 2.", with **Keep 1** / **Use 2**.

## Decisions the spec didn't cover

1. **Sign-up doesn't sign you in; the verification link does.** That way A02 answers the same whether or not the email already has an account: an existing address gets an "already have an account" email, never a second account. Opening the link verifies the address, signs in, and continues to the safe returnTo (O03 when sign-up started in checkout). Unverified accounts can still sign in with their password, and checkout never needs verification.
2. **Link lifetimes:** verification links last 24 hours (Figma says only "short-lived"); reset links last 30 minutes (spec §2). Both are single use, and a new link replaces older unused ones.
3. **Guest orders join an account when the matching email is verified** (A02/A07: "needs verified matching email; do not attach by order number alone"). This applies to orders placed as a guest with that address. O08's **Create account** prefills the order email (`/register?order=BS-…`).
4. **Rate limit:** after 5 failed sign-ins for an email in 15 minutes, the next attempt is refused with a lockout message. Unknown emails are limited the same way. Cooldowns and limits use real time, because the mock clock is usually frozen.
5. **Keep me signed in:** a 30-day session and cookie. Otherwise the session lasts 2 hours and the cookie ends with the browser.
6. **Cart merge on sign-in (spec §5.1):**
   - The customer's cart follows them across browsers and survives sign-out.
   - On sign-in, editions in both carts are deduped. When quantities differ, this visit's quantity is kept and O01 asks.
   - Items only in the account cart are added.
   - Another customer's cart left on a shared browser is never merged.
7. **A14 variants come from `reason`:** `session-expired` uses the expired panel. `auth-required` (a guarded page) and `signed-out` (the sidebar's Sign out) share the drawn "Signed out / protected route" panel.
8. **A03 "Change email":** a new sign-up goes back to A02, as drawn. A signed-in customer goes to A08, where changing the email triggers re-verification.
9. **A09 keeps an email with each saved address,** because the Figma form has an Email field. Addresses saved from O03 keep the delivery email.
10. **Default address:** the first address is the default. Deleting the default makes the next address the default.
11. **A10:** 10 orders per page. No orders at all shows E04; a filter with no matches says so instead.
12. **Reorder** puts the lines back in the cart at the price paid, so O01 shows any price or stock change as E06. Editions no longer on sale are skipped, and nothing is charged.
13. **A11 by status:**
    - Processing: "Cancel if eligible".
    - Shipped: cancellation unavailable.
    - Delivered: "Return eligible items" (within 30 days) and "Review …" per eligible line.
    - "Refund status → O13" waits for returns (Phase 4).
14. **The order snapshot toolbar now drives A07, A10, A11 and A13** for BS-10428, without changing the stored order. The delivered snapshot uses 12 Oct, so the return deadline is 11 Nov, as drawn in O12.
15. **Reviews:**
    - One per product.
    - Editing a published review sends it back to moderation.
    - The stored rating summary changes only by what was published or removed. ESV stays "4.8 / 5" and becomes 125 reviews after one approval.
16. **Seed:**
    - Jordan's wishlist holds the four A12 editions.
    - Jordan has a published NIV review from BS-10392 (A13), so NIV now has a 4/5 rating from 1 review.
    - Robin (unverified) has no orders and no wishlist, which reaches E03 and E04.
17. **A password reset also signs out this browser,** then sends the customer to A01.
18. **The A05 "Email-link destination (schematic)" panel isn't rendered.** It shows the email, which is what the Dev Inbox is for.
19. **Unsaved changes (A08):** in-app links ask through a dialog, and reload or close uses the browser's prompt. The App Router has no navigation-blocking API.

## Copy not in Figma (please confirm)

- **A01:** "Enter your password." · "Too many sign-in attempts. Wait 15 minutes, then try again, or reset your password." · "We couldn’t sign you in" (title for other errors). After E09 the button reads "Try again" and the link "Reset password" (E09 frame).
- **A02:**
  - "Enter your first name." · "Enter your last name." · "Use at least 12 characters." · "Repeat your password." · "Passwords don’t match."
  - Coming from O08: "Your order is already placed" + Figma's "Account creation is never required to complete or track the purchase."
  - "Email me offers (optional)": "unchecked by default" was dropped from the label.
- **A03:**
  - Verifying: "Checking your link…" · "✓ Email verified / Your account is ready." · "Continue to {destination}" · "We couldn’t check your link".
  - Expired: "This verification link has expired" (heading).
  - Resend: "Resend status: sent. You can send another link now."
- **A05:** "If an account matches, new instructions are on the way." (after a resend).
- **A06:** "Password updated / Sign in with your new password. Other sessions are signed out." · "Choose a password you haven’t used for this account." · "Repeat your new password."
- **A07:** "Email not verified · Verify email".
- **A08:**
  - "✓ Saved" (Figma's title is "✓ Saved confirmation variant") · "We sent a verification link to {email}."
  - "Not verified yet. Changes require a new verification email." · "Use a different email address."
  - The leave dialog: "Leave without saving? / You have unsaved changes to your profile. They will be lost if you leave this page." with **Leave page** / **Keep editing**.
- **A09:** "Add address" / "Edit address" (Figma: "Add / edit address") · "✓ Address saved" · "✓ Address deleted / Existing orders are not affected."
- **A10:** "Show orders" (the filter's submit button) · "No orders match these filters. Show all orders".
- **A11:**
  - Status lines: "This order has shipped, so it can no longer be cancelled." · "Delivered {date}." · "This order was cancelled."
  - "Cancellation unavailable: this order has shipped." · "The 30-day return window for this order has closed." · "Review {product}".
  - "None of these items can be bought right now, so nothing was added to your cart."
- **A12:** "No longer available" (an edition taken off sale).
- **A13:**
  - Errors: "Choose a rating from 1 to 5." · "Enter a review title." · "Write at least 10 characters." · "Keep your review to 2,000 characters or fewer."
  - Editing: "Edit review" · "Saving changes sends your review back to moderation; it leaves the product page until approved."
  - Writing disabled: "Writing a review isn’t available for this item" · "You can review an item once its order has been delivered." · "You can only review items you bought in this order."
  - List: "You haven’t written any reviews yet." · "Delivered items awaiting your review" · "Write a review of {product}".
  - "Delete your pending review of {product}?" (Figma draws only the published one).
- **O01 merge prompt:** "We combined your carts / Your account had a saved cart. Choose the quantity you want for items that were in both." · "{product}: we kept quantity N from this visit. Your account cart had M." · **Keep N** / **Use M**.
- **Wishlist save that failed after sign-in:** "We couldn’t save that Bible to your wishlist / That edition isn’t available any more, so it wasn’t saved. You’re signed in."
- **Emails:** the verification, reset and "You already have an account" email bodies.

## Figma vs spec

- **A09 form has an Email field;** the spec's shared AddressForm doesn't. Followed Figma (decision 9).
- **"(proposed)" was dropped from customer copy:** A05 "expires after 30 minutes (proposed)" and A13 "10–2,000 characters (proposed)". Spec §11.4 asks that proposed rules not leak into policy copy before you confirm them.
- **E10 vs A06 wording:**
  - The A06 invalid variant says "It may have expired or already been used. No password has been changed."
  - The E10 frame says "Your password was not changed. Request a new link to continue."
  - The real flow uses A06's wording; `/__dev/states` renders E10's.
- **The A14 frame draws two variants;** the spec lists three (signed-out, auth-required, session-expired). Signed-out and auth-required share the drawn panel.
- **A07 sidebar "Sign out → A14":** it already went to `/login?reason=signed-out` (Phase 0); that is now the real A14 variant.

## Open questions

1. Confirm the copy listed above.
2. **Sign-up signs in only after verification (decision 1).** It keeps A02 from revealing existing accounts, but someone signing up mid-checkout has to open the email before they're signed in. Guest checkout is unaffected. Keep this, or sign new accounts in right away?
3. **Linking guest orders when the email is verified (decision 3):** automatic, as now, or an explicit "link this order" step in O09 (Phase 4)?
4. Is the lockout rule right: 5 failed sign-ins per email per 15 minutes?
5. Is 24 hours right for verification links?
6. Still open from earlier phases:
   - confirm Phase 2 copy
   - unavailable shipping rule
   - return status order
   - admin search
   - Privacy/Terms pages (A02's Terms/Privacy are plain text for now)
   - ESV 4.8 vs 4.71
   - C02 "English / Spanish"
   - spec §11 questions 1–4

## Issues found outside this PR (not fixed)

- **A13's write page highlights "Orders" in the account sidebar,** because its route sits under `/account/orders/…`. Harmless, but Figma highlights Reviews.
- Everything from earlier phases still stands: the `apps/api` guard spec never runs in CI, `tsconfig.tsbuildinfo` is tracked, and the repo isn't Prettier-formatted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01VLAbn3MA39Gz63rpB4Qb4p
