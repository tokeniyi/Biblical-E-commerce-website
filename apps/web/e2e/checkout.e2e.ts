import { expect, test, type Page } from "@playwright/test";
import { chooseInToolbar, resetStore } from "./helpers";

/**
 * Phase 2 exit criteria (spec §9): the purchase journey, every branch, plus
 * E01, E06, E07, E08, E14 and E15 reached in the real flow.
 */

test.beforeEach(async ({ page }) => {
  await resetStore(page);
});

type Counts = { orderCount: number; paymentIntentCount: number };

async function counts(page: Page): Promise<Counts> {
  return (await (await page.request.get("/api/__dev/state")).json()) as Counts;
}

/** The drawn cart: ESV Study Bible + NIV Everyday Bible, $63.00. */
async function loadSampleCart(page: Page): Promise<void> {
  expect((await page.request.post("/api/__dev/cart/sample")).status()).toBe(200);
}

const main = (page: Page) => page.getByRole("main");
const total = (page: Page) => page.getByTestId("summary-total");

async function fillGuestDelivery(page: Page): Promise<void> {
  await page.getByLabel("Full name *", { exact: true }).fill("Jordan Lee");
  await page.getByLabel("Email *", { exact: true }).fill("jordan@example.com");
  await page.getByLabel("Address line 1 *", { exact: true }).fill("24 Oak Street");
  await page.getByLabel("City *", { exact: true }).fill("Portland");
  await page.getByLabel("State *", { exact: true }).selectOption("OR");
  await page.getByLabel("ZIP code *", { exact: true }).fill("97205");
}

async function fillCard(page: Page): Promise<void> {
  await page.getByLabel("Card number *", { exact: true }).fill("4242 4242 4242 4242");
  await page.getByLabel("Expiry *", { exact: true }).fill("12 / 30");
  await page.getByLabel("Security code *", { exact: true }).fill("123");
  await page.getByLabel("I agree to the Terms and acknowledge the Privacy Policy.").check();
}

/** Sample cart → O05 as a guest, via the real O02–O04 screens. */
async function guestToPayment(page: Page): Promise<void> {
  await loadSampleCart(page);
  await page.goto("/checkout/identity");
  await page.getByRole("link", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL("/checkout/delivery");
  await fillGuestDelivery(page);
  await page.getByRole("button", { name: "Continue to delivery method" }).click();
  await expect(page).toHaveURL("/checkout/shipping");
  await page.getByRole("link", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL("/checkout/payment");
  await expect(page.getByRole("heading", { level: 1, name: "Payment & review order" })).toBeVisible();
}

test.describe("purchase journey", () => {
  test("guest happy path C05 → C07 → O01 → O02 → O03 → O04 → O05 → O06 → O08", async ({ page }) => {
    await page.goto("/products/niv-everyday-bible");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Continue shopping" }).click();
    await page.goto("/products/esv-study-bible");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "View cart" }).click();

    // O01 as drawn.
    await expect(page).toHaveURL("/cart");
    await expect(main(page).getByRole("row")).toHaveCount(3);
    await expect(main(page).getByText("Min 1 · Max 12")).toBeVisible();
    await expect(main(page).getByText("Min 1 · Max 26")).toBeVisible();
    await expect(total(page)).toHaveText("Total$73.04");
    await expect(page.getByText("Tax sample: 8% of $63.00 = $5.04.")).toBeVisible();
    await expect(page.getByText("USD · Tax finalized after address; no promo applied.")).toBeVisible();
    await page.getByRole("link", { name: "Checkout", exact: true }).click();

    // O02
    await expect(page).toHaveURL("/checkout/identity");
    await expect(page.getByText("Checkout / 1 / Identity")).toBeVisible();
    await expect(page.getByText("2 items · NIV Everyday Bible + ESV Study Bible.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?returnTo=%2Fcheckout%2Fdelivery");
    await page.getByRole("link", { name: "Continue as guest" }).click();

    // O03: guests don't see the saved-address choice or "Save this address".
    await expect(page.getByText("Saved address")).toHaveCount(0);
    await expect(page.getByLabel("Save this address to my account")).toHaveCount(0);
    await fillGuestDelivery(page);
    await page.getByRole("button", { name: "Continue to delivery method" }).click();

    // O04: server rates, recalc on select.
    await expect(page).toHaveURL("/checkout/shipping");
    await expect(page.getByText("Jordan Lee · jordan@example.com")).toBeVisible();
    await expect(page.getByText("24 Oak Street, Portland, OR 97205, US")).toBeVisible();
    await expect(page.getByText("Standard · $5.00 · Estimated 12–14 Oct 2026")).toBeVisible();
    await expect(page.getByText("If chosen: subtotal $63.00 + shipping $12.00 + tax $5.04 = $80.04")).toBeVisible();
    await page.getByRole("radio", { name: /Express · \$12\.00 · Estimated 9–10 Oct/ }).check();
    await expect(total(page)).toHaveText("Total$80.04");
    await page.getByRole("radio", { name: /Standard · \$5\.00/ }).check();
    await expect(total(page)).toHaveText("Total$73.04");
    await page.getByRole("link", { name: "Continue to payment" }).click();

    // O05
    await expect(page.getByText("Standard $5.00 · 12–14 Oct")).toBeVisible();
    await expect(page.getByText("Submitting requests a payment of $73.04 USD.")).toBeVisible();
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();

    // O06 → O08 only after the server verifies payment.
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);
    await expect(page.getByRole("heading", { level: 1, name: "Order confirmed" })).toBeVisible();
    await expect(page.getByText("Order BS-10429 · Placed 7 Oct 2026 · $73.04 paid. Receipt sent to jordan@example.com.")).toBeVisible();
    await expect(main(page).getByRole("rowheader", { name: "ESV Study Bible · Hardcover / Standard" })).toBeVisible();
    await expect(page.getByText("Standard · $5.00 · Estimated 12–14 Oct 2026")).toBeVisible();
    await expect(page.getByText("Paid · Visa ending 4242")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Guest? Save your order to an account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Track order" })).toHaveAttribute("href", "/orders/BS-10429/tracking");
    await expect(page.getByRole("link", { name: "Cart (0)" })).toBeVisible();
    expect(await counts(page)).toMatchObject({ orderCount: 3, paymentIntentCount: 1 });

    // The receipt is in the Dev Inbox.
    await page.goto("/__dev/inbox");
    await expect(page.getByText("Order BS-10429 confirmed")).toBeVisible();
  });

  test("O08 is not public: another browser gets the 404 page", async ({ page, browser }) => {
    await guestToPayment(page);
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);

    const stranger = await browser.newPage();
    const res = await stranger.goto("/orders/BS-10429/confirmation");
    expect(res?.status()).toBe(404);
    await expect(stranger.getByText("BS-10429")).toHaveCount(0);
    await stranger.close();
  });

  test("signed in: O02 skips to O03 with the saved address; paid order has no guest prompt", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/cart");
    await chooseInToolbar(page, "Identity", "customer");
    await page.goto("/checkout/identity");
    await expect(page).toHaveURL("/checkout/delivery");
    await expect(page.getByRole("radio", { name: "Default: Jordan Lee, 24 Oak Street" })).toBeChecked();
    await expect(page.getByLabel("Email *", { exact: true })).toHaveValue("jordan@example.com");
    await expect(page.getByLabel("ZIP code *", { exact: true })).toHaveValue("97205");
    await page.getByRole("button", { name: "Continue to delivery method" }).click();
    await page.getByRole("link", { name: "Continue to payment" }).click();
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);
    await expect(page.getByRole("heading", { name: "Guest? Save your order to an account" })).toHaveCount(0);
  });

  test("declined → O07 keeps the details → retry → O08, one order", async ({ page }) => {
    await guestToPayment(page);
    await page.goto("/checkout/payment?scenario=payment:declined");
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();

    await expect(page).toHaveURL(/\/checkout\/payment\?status=failed&intent=pi_/);
    await expect(page.getByRole("heading", { level: 1, name: "Payment couldn’t be completed" })).toBeVisible();
    await expect(page.getByText("Card declined — payment not completed")).toBeVisible();
    await expect(page.getByText("ESV Study Bible × 1 · NIV Everyday Bible × 1")).toBeVisible();
    await expect(page.getByText("Delivery to Jordan Lee, 24 Oak Street, Portland")).toBeVisible();
    await expect(page.getByText("Amount due $73.04")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
    expect(await counts(page)).toMatchObject({ orderCount: 2, paymentIntentCount: 1 });

    await page.goto("/checkout/payment?scenario=payment:paid");
    // Card values were cleared; delivery details were kept.
    await expect(page.getByLabel("Card number *", { exact: true })).toHaveValue("");
    await expect(page.getByText("Jordan Lee · 24 Oak Street")).toBeVisible();
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);
    expect(await counts(page)).toMatchObject({ orderCount: 3, paymentIntentCount: 2 });
  });

  test("uncertain → E15 → Check status → paid: exactly one order, one charge", async ({ page }) => {
    await guestToPayment(page);
    await page.goto("/checkout/payment?scenario=payment:uncertain-paid");
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();

    await expect(page).toHaveURL(/\/checkout\/processing\?intent=pi_/);
    await expect(page.getByRole("heading", { level: 1, name: "Processing your payment" })).toBeVisible();
    await expect(page.getByText("Your order is not confirmed yet.", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Network uncertain" })).toBeVisible();
    await expect(page.getByText("We’re checking whether payment completed. Don’t pay again yet.")).toBeVisible();
    // Never two outcomes at once.
    await expect(page.getByText("Card declined")).toHaveCount(0);
    await expect(page.getByText("Thank you")).toHaveCount(0);

    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);
    expect(await counts(page)).toMatchObject({ orderCount: 3, paymentIntentCount: 1 });
  });

  test("uncertain → Check status → verified failed → O07; pending stays on O06", async ({ page }) => {
    await guestToPayment(page);
    await page.goto("/checkout/payment?scenario=payment:uncertain-failed");
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();
    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page).toHaveURL(/\/checkout\/payment\?status=failed/);
    await expect(page.getByText("Card declined — payment not completed")).toBeVisible();

    await page.goto("/checkout/payment?scenario=payment:pending");
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();
    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page.getByText("Payment is still pending.")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout\/processing/);
    expect(await counts(page)).toMatchObject({ orderCount: 2, paymentIntentCount: 2 });
  });

  test("a failed submit is uncertain (E15); Check status reuses the same attempt", async ({ page }) => {
    await guestToPayment(page);
    await page.goto("/checkout/payment?scenario=network:fail-write");
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $73.04" }).click();
    await expect(page.getByRole("heading", { name: "Network uncertain" })).toBeVisible();
    expect(await counts(page)).toMatchObject({ paymentIntentCount: 0 });
    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);
    expect(await counts(page)).toMatchObject({ orderCount: 3, paymentIntentCount: 1 });
  });

  test("E06: stock and price change → payment blocked → accept → O01 at $74.12 → pay", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/cart");
    await page.getByRole("button", { name: "Increase quantity: ESV Study Bible" }).click();
    await expect(page.getByRole("link", { name: "Cart (3)" })).toBeVisible();
    await page.goto("/checkout/identity");
    await page.getByRole("link", { name: "Continue as guest" }).click();
    await fillGuestDelivery(page);
    await page.getByRole("button", { name: "Continue to delivery method" }).click();
    await page.getByRole("link", { name: "Continue to payment" }).click();
    await expect(page).toHaveURL("/checkout/payment");

    await page.goto("/checkout/payment?scenario=quote:both");
    const e06 = page.getByRole("region", { name: "Review changes before paying" });
    await expect(e06.getByRole("row", { name: /ESV-ST-HC/ })).toHaveText(/Qty 2 \/ \$39\.00 each\s*Only 1 available/);
    await expect(e06.getByRole("row", { name: /NIV-EV-PB/ })).toHaveText(/\$24\.00\s*\$25\.00 current price/);
    await expect(e06.getByText("After accepting: $64.00 + $5.00 shipping + $5.12 tax = $74.12.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay / })).toBeDisabled();

    await e06.getByRole("button", { name: "Accept & update" }).click();
    await expect(page).toHaveURL("/cart");
    await expect(page.getByRole("region", { name: "Review changes before paying" })).toHaveCount(0);
    await expect(total(page)).toHaveText("Total$74.12");
    // The drift fired once; it doesn't come back.
    await page.reload();
    await expect(total(page)).toHaveText("Total$74.12");
    await page.goto("/checkout/payment");
    await fillCard(page);
    await page.getByRole("button", { name: "Pay $74.12" }).click();
    await expect(page).toHaveURL(/\/orders\/BS-10429\/confirmation$/);
  });

  test("E06 on O01 blocks checkout; Remove affected item clears it", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/cart?scenario=quote:price");
    const e06 = page.getByRole("region", { name: "Review changes before paying" });
    await expect(e06.getByRole("row", { name: /NIV-EV-PB/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Checkout", exact: true })).toBeDisabled();
    await e06.getByRole("button", { name: "Remove affected item" }).click();
    await expect(page.getByRole("region", { name: "Review changes before paying" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Checkout", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();
  });
});

test.describe("O01 cart", () => {
  test("quantity limits, remove confirm (Keep / Remove) → E01 empty cart", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/cart");
    await expect(page.getByRole("button", { name: "Decrease quantity: ESV Study Bible" })).toBeDisabled();
    await page.getByRole("button", { name: "Increase quantity: NIV Everyday Bible" }).click();
    await expect(total(page)).toHaveText("Total$98.96");

    const removeEsv = page.getByRole("button", { name: "Remove: ESV Study Bible" });
    await removeEsv.click();
    const dialog = page.getByRole("dialog", { name: "Remove item" });
    await expect(dialog).toContainText("Remove ESV Study Bible? You can save it for later instead.");
    await expect(dialog.getByRole("button", { name: "Keep" })).toBeFocused();
    await dialog.getByRole("button", { name: "Keep" }).click();
    await expect(dialog).toBeHidden();
    await expect(removeEsv).toBeFocused();

    await removeEsv.click();
    await dialog.getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByRole("button", { name: "Remove: NIV Everyday Bible" }).click();
    await dialog.getByRole("button", { name: "Remove", exact: true }).click();

    // E01
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await expect(page.getByText("Browse Bibles and choose an edition to get started.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Bibles" })).toHaveAttribute("href", "/categories/bibles");
    await expect(page.getByRole("link", { name: "Saved items" })).toHaveAttribute("href", "/cart/saved");
    await expect(page.getByRole("button", { name: "Checkout" })).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Cart: 0 items." })).toBeAttached();
    await expect(page.getByRole("link", { name: "Cart (0)" })).toBeVisible();
    // Persisted: still empty after reload, and checkout sends you back here.
    await page.goto("/checkout/identity");
    await expect(page).toHaveURL("/cart");
  });

  test("Save → C08 moves the item out of the totals", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: "Saved for later (2)" })).toBeVisible();
    await page.getByRole("button", { name: "Save for later: ESV Study Bible" }).click();
    await expect(page).toHaveURL("/cart/saved");
    await expect(page.getByRole("rowheader", { name: "ESV Study Bible" })).toBeVisible();
    await page.goto("/cart");
    await expect(total(page)).toHaveText("Total$30.92");
    await expect(page.getByRole("link", { name: "Saved for later (3)" })).toBeVisible();
  });

  test("E08: expired, unrecognized and forced-ineligible codes keep the code and totals; READ10 applies", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/cart");
    const code = page.getByLabel("Code", { exact: true });

    await code.fill("STUDY15");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "This code has expired. No discount was applied." })).toBeVisible();
    await expect(code).toHaveValue("STUDY15");
    await expect(total(page)).toHaveText("Total$73.04");

    await page.getByRole("button", { name: "Try another code" }).click();
    await expect(code).toBeFocused();
    await code.fill("NOPE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Code not recognized." })).toBeVisible();
    await page.getByRole("button", { name: "Remove code" }).click();
    await expect(code).toHaveValue("");

    await code.fill("read10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Promo READ10 applied.", { exact: true })).toBeVisible();
    await expect(total(page)).toHaveText("Total$66.24");

    await page.getByRole("button", { name: "Remove code" }).click();
    await expect(total(page)).toHaveText("Total$73.04");
    await page.goto("/cart?scenario=promo:ineligible");
    await page.getByLabel("Code", { exact: true }).fill("READ10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "This code doesn’t apply to the items in your cart." })).toBeVisible();
    await expect(total(page)).toHaveText("Total$73.04");
  });
});

test.describe("O03 / O04 edge states", () => {
  test("E07: error summary, inline errors, focus on the first invalid field; fixing continues", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/checkout/delivery");
    await fillGuestDelivery(page);
    await page.getByLabel("Address line 1 *", { exact: true }).fill("");
    await page.getByLabel("ZIP code *", { exact: true }).fill("97");
    await page.getByRole("button", { name: "Continue to delivery method" }).click();

    const summary = page.getByRole("alert").filter({ hasText: "Check 2 fields" });
    await expect(summary.getByRole("link")).toHaveText(["Address line 1 is required.", "ZIP code is invalid."]);
    const line1 = page.getByLabel("Address line 1 *", { exact: true });
    await expect(line1).toBeFocused();
    await expect(line1).toHaveAttribute("aria-invalid", "true");
    await expect(line1).toHaveAccessibleDescription("Enter a street address.");
    await expect(page.getByLabel("ZIP code *", { exact: true })).toHaveAccessibleDescription("Use a valid 5-digit ZIP.");
    await summary.getByRole("link", { name: "ZIP code is invalid." }).click();
    await expect(page.getByLabel("ZIP code *", { exact: true })).toBeFocused();
    await expect(page).toHaveURL("/checkout/delivery");

    await line1.fill("24 Oak Street");
    await page.getByLabel("ZIP code *", { exact: true }).fill("97205");
    await page.getByRole("button", { name: "Continue to delivery method" }).click();
    await expect(page).toHaveURL("/checkout/shipping");
    // Back never loses safe fields.
    await page.getByRole("link", { name: "Edit address" }).click();
    await expect(page.getByLabel("Address line 1 *", { exact: true })).toHaveValue("24 Oak Street");
  });

  test("E14 on O03 and O04: no methods, payment blocked, address kept", async ({ page }) => {
    await loadSampleCart(page);
    await page.goto("/checkout/delivery?scenario=shipping:unsupported");
    await fillGuestDelivery(page);
    await page.getByRole("button", { name: "Continue to delivery method" }).click();
    await expect(page.getByText("We can’t ship to this address")).toBeVisible();
    await expect(page.getByText("No delivery methods are available for the selected region. Your cart has not changed.")).toBeVisible();
    await expect(page).toHaveURL("/checkout/delivery");
    await expect(page.getByLabel("Address line 1 *", { exact: true })).toHaveValue("24 Oak Street");
    await page.getByRole("button", { name: "Edit address" }).click();
    await expect(page.getByLabel("Address line 1 *", { exact: true })).toBeFocused();

    await page.goto("/checkout/shipping");
    await expect(page.getByText("We can’t ship to this address")).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to cart" })).toHaveAttribute("href", "/cart");
    await page.goto("/checkout/payment");
    await expect(page.getByRole("button", { name: /^Pay / })).toBeDisabled();

    await page.goto("/checkout/shipping?scenario=shipping:supported");
    await expect(page.getByRole("radio")).toHaveCount(2);
  });
});
