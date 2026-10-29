import { expect, test, type Page } from "@playwright/test";
import { chooseInToolbar, resetStore } from "./helpers";

/**
 * Phase 3 exit criteria (spec §9): the auth, wishlist and review journey
 * (spec §8 journey 2), returnTo safety, and E03, E04, E09, E10, E11
 * reached in the real flow.
 */

test.beforeEach(async ({ page }) => {
  await resetStore(page);
});

const PASSWORD = "wireframe-password";
const main = (page: Page) => page.getByRole("main");

async function signIn(page: Page, email = "jordan@example.com", password = PASSWORD): Promise<void> {
  await page.getByLabel("Email *", { exact: true }).fill(email);
  await page.getByLabel("Password *", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^(Sign in|Try again)$/ }).click();
}

/** The newest Dev Inbox message of a kind, read through the dev API. */
async function inboxLink(page: Page, kind: string): Promise<string> {
  const { messages } = (await (await page.request.get("/api/__dev/inbox")).json()) as {
    messages: { kind: string; link: string | null; to: string }[];
  };
  const link = messages.find((m) => m.kind === kind)?.link;
  if (!link) throw new Error(`no ${kind} message`);
  return link;
}

async function signInAs(page: Page, identity: "customer" | "unverified"): Promise<void> {
  expect((await page.request.post("/api/__dev/identity", { data: { identity } })).status()).toBe(200);
}

test.describe("sign in and protected routes", () => {
  test("A14 → A01 → A07: a protected page asks for sign-in and comes back", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL("/login?returnTo=%2Faccount%2Forders&reason=auth-required");
    await expect(page.getByRole("heading", { level: 1, name: "Please sign in to continue" })).toBeVisible();
    await expect(main(page)).toContainText("Sign in to access your profile, orders, wishlist and reviews.");
    await main(page).getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/login?returnTo=%2Faccount%2Forders");
    await expect(main(page)).toContainText("Returning to: Your orders");
    await signIn(page);
    await expect(page).toHaveURL("/account/orders");
    await expect(page.getByRole("heading", { level: 1, name: "Your orders" })).toBeVisible();

    await page.getByRole("navigation", { name: "Account menu" }).getByRole("link", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
    await expect(main(page)).toContainText("Welcome, Jordan Lee. Manage your details and purchases.");
    await expect(main(page)).toContainText("Portland, Oregon · Default");
    await expect(main(page)).toContainText("2 orders · 1 processing");
    await expect(main(page)).toContainText("Latest: BS-10428 · $73.04");
    await expect(main(page)).toContainText("4 saved Bibles · 1 review");
    await expect(main(page)).toContainText("1 eligible delivered item awaiting review");
  });

  test("E09: generic error, email kept, password cleared; then sign-in works", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter an email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();

    await signIn(page, "jordan@example.com", "not-the-password");
    const alert = page.getByRole("alert").filter({ hasText: "Email or password is incorrect" });
    await expect(alert).toContainText("Check your details and try again. Your cart is still saved.");
    await expect(page.getByLabel("Email *", { exact: true })).toHaveValue("jordan@example.com");
    await expect(page.getByLabel("Password *", { exact: true })).toHaveValue("");
    await expect(page.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/password/forgot?returnTo=%2Faccount");

    // An unknown email gets exactly the same answer.
    await signIn(page, "nobody@example.com", "whatever");
    await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect" })).toBeVisible();

    await signIn(page);
    await expect(page).toHaveURL("/account");
  });

  test("an external returnTo is rejected: sign-in lands on the account", async ({ page }) => {
    await page.goto("/login?returnTo=https%3A%2F%2Fevil.example%2Fsteal");
    await expect(main(page)).toContainText("Returning to: Your account");
    await signIn(page);
    await expect(page).toHaveURL("/account");
    await page.goto("/login?returnTo=%2F%2Fevil.example");
    // Already signed in: the unsafe destination still resolves to the account.
    await expect(page).toHaveURL("/account");
  });

  test("O02 → A01 keeps the cart and returns to O03 with the saved address", async ({ page }) => {
    expect((await page.request.post("/api/__dev/cart/sample")).status()).toBe(200);
    await page.goto("/checkout/identity");
    await main(page).getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login?returnTo=%2Fcheckout%2Fdelivery");
    await expect(main(page)).toContainText("Returning to: Checkout / Delivery");
    await signIn(page);
    await expect(page).toHaveURL("/checkout/delivery");
    await expect(page.getByLabel("Default: Jordan Lee, 24 Oak Street")).toBeChecked();
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  });

  test("sign-in merge: same edition in both carts keeps this visit's quantity and asks", async ({ page, browser }) => {
    // Jordan's cart on another device.
    const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const otherPage = await other.newPage();
    expect((await otherPage.request.post("/api/cart/lines", { data: { sku: "NIV-EV-PB", quantity: 2 } })).status()).toBe(200);
    await otherPage.goto("/login");
    await signIn(otherPage);
    await expect(otherPage).toHaveURL("/account");
    await other.close();

    // This browser, signed out, has one NIV.
    expect((await page.request.post("/api/cart/lines", { data: { sku: "NIV-EV-PB", quantity: 1 } })).status()).toBe(200);
    await page.goto("/login?returnTo=%2Fcart");
    await signIn(page);
    await expect(page).toHaveURL("/cart");
    const prompt = page.getByRole("region", { name: "We combined your carts" });
    await expect(prompt).toContainText("NIV Everyday Bible: we kept quantity 1 from this visit. Your account cart had 2.");
    await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();
    await prompt.getByRole("button", { name: "Use 2" }).click();
    await expect(prompt).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  });

  test("sign out → A14 signed-out variant; the cart survives logout", async ({ page }) => {
    expect((await page.request.post("/api/__dev/cart/sample")).status()).toBe(200);
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL("/account");
    await page.getByRole("navigation", { name: "Account menu" }).getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login?reason=signed-out");
    await expect(page.getByRole("heading", { level: 1, name: "Please sign in to continue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
    await page.goto("/account");
    await expect(page).toHaveURL(/reason=auth-required/);
  });
});

test.describe("create account and verify (A02 → A03)", () => {
  test("sign-up from checkout → Dev Inbox link → verified → back to O03", async ({ page }) => {
    await page.goto("/register?returnTo=%2Fcheckout%2Fdelivery");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Check 6 fields" })).toBeVisible();
    await expect(page.getByLabel("First name *", { exact: true })).toBeFocused();

    await page.getByLabel("First name *", { exact: true }).fill("Casey");
    await page.getByLabel("Last name *", { exact: true }).fill("Nguyen");
    await page.getByLabel("Email *", { exact: true }).fill("casey@example.com");
    await page.getByLabel("Password *", { exact: true }).fill("short");
    await page.getByLabel("Confirm password *", { exact: true }).fill("different");
    await page.getByLabel("I agree to the Terms and acknowledge the Privacy Policy.").check();
    await expect(page.getByLabel("Email me offers (optional)")).not.toBeChecked();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 12 characters.")).toBeVisible();
    await expect(page.getByText("Passwords don’t match.")).toBeVisible();

    await page.getByLabel("Password *", { exact: true }).fill("a long enough passphrase");
    await page.getByLabel("Confirm password *", { exact: true }).fill("a long enough passphrase");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/verify-email");
    await expect(page.getByRole("heading", { name: "Check casey@example.com" })).toBeVisible();

    // Resend respects the 60 s cooldown.
    await page.getByRole("button", { name: "Resend email" }).click();
    await expect(page.getByText(/Resend status: sent\. Try again after \d+ seconds\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend email" })).toBeDisabled();

    // Not signed in until the link is opened.
    expect(((await (await page.request.get("/api/session")).json()) as { session: { kind: string } }).session.kind).toBe("anonymous");
    const link = await inboxLink(page, "verify-email");
    await page.goto(link);
    await expect(page.getByRole("status").filter({ hasText: "✓ Email verified" })).toBeVisible();
    await page.getByRole("link", { name: "Continue to Checkout / Delivery" }).click();
    // An empty cart goes back to O01 (E01): sign-up never needed a cart.
    await expect(page).toHaveURL("/cart");

    // The link was single use.
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "This verification link has expired" })).toBeVisible();
    await expect(main(page)).toContainText("No account data was exposed.");
  });

  test("an email that already has an account gets the same A03 and no account", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("First name *", { exact: true }).fill("Jordan");
    await page.getByLabel("Last name *", { exact: true }).fill("Lee");
    await page.getByLabel("Email *", { exact: true }).fill("jordan@example.com");
    await page.getByLabel("Password *", { exact: true }).fill("a long enough passphrase");
    await page.getByLabel("Confirm password *", { exact: true }).fill("a long enough passphrase");
    await page.getByLabel("I agree to the Terms and acknowledge the Privacy Policy.").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check jordan@example.com" })).toBeVisible();
    await page.goto("/__dev/inbox");
    await expect(page.getByTestId("inbox-message").first()).toContainText("You already have an account");
  });

  test("A03 expired link (Auth tokens scenario) offers a new link", async ({ page }) => {
    await signInAs(page, "unverified");
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: "Check robin@example.com" })).toBeVisible();
    await page.getByRole("button", { name: "Resend email" }).click();
    await expect(page.getByText(/Resend status: sent/)).toBeVisible();
    const link = await inboxLink(page, "verify-email");
    await page.goto(`${link}&scenario=tokens:verification-expired`);
    await expect(page.getByRole("heading", { name: "This verification link has expired" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send a new link" })).toBeVisible();
  });
});

test.describe("password reset (A04 → A05 → A06 / E10)", () => {
  test("generic answer, Dev Inbox link, new password, other sessions signed out, link single use", async ({ page, browser }) => {
    // Another signed-in device.
    const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const otherPage = await other.newPage();
    await otherPage.goto("/login");
    await signIn(otherPage);
    await expect(otherPage).toHaveURL("/account");

    await page.goto("/password/forgot");
    await page.getByLabel("Email *", { exact: true }).fill("jordan@");
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await page.getByLabel("Email *", { exact: true }).fill("jordan@example.com");
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page).toHaveURL("/password/sent?returnTo=%2Faccount");
    await expect(page.getByRole("status").filter({ hasText: "If an account matches, instructions are on the way" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Resend after \d+ s/ })).toBeDisabled();

    const link = await inboxLink(page, "password-reset");
    await page.goto(link);
    await expect(page.getByRole("heading", { level: 1, name: "Set a new password" })).toBeVisible();
    await page.getByLabel("New password *", { exact: true }).fill("a brand new passphrase");
    await page.getByLabel("Confirm new password *", { exact: true }).fill("a different passphrase");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Passwords don’t match.")).toBeVisible();
    await page.getByLabel("Confirm new password *", { exact: true }).fill("a brand new passphrase");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Password updated" })).toContainText("Other sessions are signed out.");

    await otherPage.goto("/account");
    await expect(otherPage).toHaveURL(/\/login\?returnTo=%2Faccount/);
    await other.close();

    await page.getByRole("link", { name: "Sign in" }).first().click();
    await signIn(page, "jordan@example.com", "a brand new passphrase");
    await expect(page).toHaveURL("/account");

    // E10: the used link no longer offers any field.
    await page.goto(link);
    await expect(page.getByRole("alert").filter({ hasText: "This reset link is no longer valid" })).toBeVisible();
    await expect(page.getByLabel("New password *", { exact: true })).toHaveCount(0);
  });

  test("unknown emails get the same A05", async ({ page }) => {
    await page.goto("/password/forgot");
    await page.getByLabel("Email *", { exact: true }).fill("nobody@example.com");
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page.getByRole("status").filter({ hasText: "If an account matches, instructions are on the way" })).toBeVisible();
    expect(((await (await page.request.get("/api/__dev/inbox")).json()) as { messages: unknown[] }).messages).toHaveLength(0);
  });

  test("E10: an expired reset link (scenario) shows no fields and links to A04 and A01", async ({ page }) => {
    await page.goto("/password/forgot");
    await page.getByLabel("Email *", { exact: true }).fill("jordan@example.com");
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page).toHaveURL(/\/password\/sent/);
    await page.goto(`${await inboxLink(page, "password-reset")}&scenario=tokens:reset-expired`);
    await expect(page.getByRole("alert").filter({ hasText: "This reset link is no longer valid" })).toContainText(
      "It may have expired or already been used. No password has been changed.",
    );
    await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/password/forgot");
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  });
});

test.describe("E11 session expired", () => {
  test("A11 with an expired session → A14 → sign in → back to the order", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/orders/BS-10428");
    await expect(page.getByRole("heading", { level: 1, name: "Order details" })).toBeVisible();
    expect((await page.request.post("/api/__dev/session/expire")).status()).toBe(200);
    await page.reload();
    await expect(page).toHaveURL("/login?returnTo=%2Faccount%2Forders%2FBS-10428&reason=session-expired");
    await expect(page.getByRole("alert").filter({ hasText: "Your session has expired" })).toContainText(
      "Sign in again to view your order. Your cart is still saved; no new purchase was submitted.",
    );
    await expect(main(page)).toContainText("Return destination: /account/orders/BS-10428");
    await page.getByRole("link", { name: "Sign in again" }).click();
    await signIn(page);
    await expect(page).toHaveURL("/account/orders/BS-10428");
  });

  test("a guarded save with an expired session keeps the draft through sign-in", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/profile");
    await page.getByLabel("Phone", { exact: true }).fill("503-555-0100");
    expect((await page.request.post("/api/__dev/session/expire")).status()).toBe(200);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/login?returnTo=%2Faccount%2Fprofile&reason=session-expired");
    await page.getByRole("link", { name: "Sign in again" }).click();
    await signIn(page);
    await expect(page).toHaveURL("/account/profile");
    await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("503-555-0100");
  });
});

test.describe("account pages", () => {
  test("A08: validation, saved announcement without navigating, unsaved-changes guard", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/profile");
    await page.getByLabel("Email *", { exact: true }).fill("jordan@");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email *", { exact: true })).toBeFocused();

    // Leaving with unsaved changes asks first.
    await page.getByRole("navigation", { name: "Account menu" }).getByRole("link", { name: "Orders" }).click();
    const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(page).toHaveURL("/account/profile");

    await page.getByLabel("Email *", { exact: true }).fill("jordan@example.com");
    await page.getByLabel("Last name *", { exact: true }).fill("Lee-Park");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "✓ Saved" })).toContainText(
      "Your profile has been updated. No order delivery details were changed.",
    );
    await expect(page).toHaveURL("/account/profile");
    // Saved: navigating away no longer asks.
    await page.getByRole("navigation", { name: "Account menu" }).getByRole("link", { name: "Overview" }).click();
    await expect(main(page)).toContainText("Welcome, Jordan Lee-Park.");
  });

  test("A09: add with E07, set default, delete with confirmation; orders keep their address", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/addresses");
    await expect(main(page)).toContainText("Saved address / Default");
    await page.getByRole("link", { name: "Add address" }).click();
    await expect(page).toHaveURL("/account/addresses/new");
    await page.getByLabel("ZIP code *", { exact: true }).fill("97");
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Check \d+ fields/ })).toContainText("ZIP code is invalid.");
    await expect(page.getByLabel("Full name *", { exact: true })).toBeFocused();

    await page.getByLabel("Full name *", { exact: true }).fill("Jordan Lee");
    await page.getByLabel("Address line 1 *", { exact: true }).fill("1 Pine Road");
    await page.getByLabel("City *", { exact: true }).fill("Salem");
    await page.getByLabel("State *", { exact: true }).selectOption("OR");
    await page.getByLabel("ZIP code *", { exact: true }).fill("97301");
    await page.getByLabel("Set as my default delivery address").check();
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page).toHaveURL("/account/addresses?status=saved");
    await expect(page.getByRole("status").filter({ hasText: "✓ Address saved" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "1 Pine Road" })).toContainText("Saved address / Default");

    await page.getByRole("button", { name: "Delete 1 Pine Road" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete confirmation" });
    await expect(dialog).toContainText("Delete this saved address? Existing orders are not affected.");
    await expect(dialog.getByRole("button", { name: "Keep" })).toBeFocused();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("status").filter({ hasText: "✓ Address deleted" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "24 Oak Street" })).toContainText("Saved address / Default");
  });

  test("A10: filters live in the URL; E04 for a customer without orders", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/orders");
    const rows = page.getByRole("table").getByRole("row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toContainText("BS-10428");
    await expect(rows.nth(1)).toContainText("Processing · Paid");
    await expect(rows.nth(2)).toContainText("Delivered · 18 Sep");
    await expect(page.getByText("Showing 1–2 of 2 orders")).toBeVisible();
    await page.getByLabel("Order status").selectOption("delivered");
    await page.getByRole("button", { name: "Show orders" }).click();
    await expect(page).toHaveURL("/account/orders?status=delivered&q=&page=1");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText("BS-10392");

    await signInAs(page, "unverified");
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { name: "You haven’t placed an account order" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find guest order" })).toHaveAttribute("href", "/orders/lookup");
  });

  test("A11: another customer's order is a 404; shipped disables cancel; Reorder → O01", async ({ page }) => {
    await signInAs(page, "unverified");
    const res = await page.goto("/account/orders/BS-10428");
    expect(res?.status()).toBe(404);

    await signInAs(page, "customer");
    await page.goto("/account/orders/BS-10428");
    await expect(main(page)).toContainText("BS-10428 / Processing · Paid $73.04");
    await expect(page.getByRole("link", { name: "Cancel if eligible" })).toHaveAttribute("href", "/orders/BS-10428/cancel");
    await expect(main(page)).toContainText("Portland, OR 97205 · Standard shipping");
    await expect(main(page)).toContainText("Estimated 12–14 Oct");

    await chooseInToolbar(page, /Order BS-10428 snapshot/, "shipped");
    await page.reload();
    await expect(page.getByRole("link", { name: "Cancel if eligible" })).toHaveCount(0);
    await expect(main(page)).toContainText("Cancellation unavailable: this order has shipped.");

    await page.getByRole("button", { name: "Reorder (stock check)" }).click();
    await expect(page).toHaveURL("/cart");
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  });
});

test.describe("wishlist (A12)", () => {
  test("signed-out ♡ → A01 → back with ♥ Saved → A12 → Move to cart → C07 → O01", async ({ page }) => {
    await page.goto("/categories/bibles?translation=ESV");
    // Sam's wishlist is empty.
    await page.getByRole("link", { name: "♡ Save ESV Study Bible (sign in to save)" }).click();
    await expect(page).toHaveURL("/login?returnTo=%2Fcategories%2Fbibles%3Ftranslation%3DESV&save=ESV-ST-HC");
    await signIn(page, "sam@example.com");
    await expect(page).toHaveURL("/categories/bibles?translation=ESV");
    await expect(page.getByText("♥ Saved").first()).toBeVisible();

    await page.getByRole("link", { name: "View wishlist" }).first().click();
    await expect(page).toHaveURL("/account/wishlist");
    await expect(main(page)).toContainText("1 saved Bible · Availability is checked before cart transfer.");
    await page.getByRole("button", { name: "Move to cart: ESV Study Bible" }).click();
    await expect(page).toHaveURL("/products/esv-study-bible?variant=ESV-ST-HC&cart=added");
    await expect(page.getByRole("dialog", { name: "✓ Added to your cart" })).toBeVisible();
    await page.getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL("/cart");
    // The wishlist keeps the item until it is removed.
    await page.goto("/account/wishlist");
    await expect(main(page)).toContainText("ESV-ST-HC · 12 available");
  });

  test("a ♡ for an edition that left sale is not claimed as saved", async ({ page }) => {
    await page.goto("/login?returnTo=%2Fproducts%2Fesv-study-bible&save=ESV-ST-LL-LP");
    await signIn(page, "sam@example.com");
    await expect(page).toHaveURL("/products/esv-study-bible?wishlist=not-saved");
    await expect(page.getByRole("alert").filter({ hasText: "We couldn’t save that Bible to your wishlist" })).toBeVisible();
  });

  test("A12 as drawn, out-of-stock item, remove confirmation, then E03", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/wishlist");
    await expect(main(page)).toContainText("4 saved Bibles");
    await expect(page.getByRole("button", { name: /^Move to cart:/ })).toHaveCount(3);
    const oos = page.getByRole("region", { name: "Out-of-stock wishlist item" });
    await expect(oos).toContainText("NLT Children’s Bible · $22.00");
    await expect(oos).toContainText("NLT-CH-HC · Hardcover · Out of stock");
    await expect(oos.getByRole("link", { name: /Find alternatives/ })).toHaveAttribute("href", "/categories/children");

    for (const name of ["ESV Study Bible", "NIV Everyday Bible", "KJV Large Print Bible", "NLT Children’s Bible"]) {
      await page.getByRole("button", { name: new RegExp(`^Remove(?: from wishlist)?: ${name}$`) }).click();
      const dialog = page.getByRole("dialog", { name: "Remove item confirmation" });
      await expect(dialog).toContainText(`Remove ${name} from wishlist?`);
      await dialog.getByRole("button", { name: "Confirm" }).click();
      await expect(dialog).toBeHidden();
    }
    await expect(page.getByRole("heading", { name: "No saved Bibles yet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discover Bibles" })).toHaveAttribute("href", "/categories/bibles");
    await expect(page.getByRole("link", { name: "Account overview" })).toHaveAttribute("href", "/account");
  });
});

test.describe("reviews (A13)", () => {
  test("A11 delivered → A13 write → pending → approve → visible on C06", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/orders/BS-10392");
    await page.getByRole("link", { name: "Review ESV Study Bible" }).click();
    await expect(page).toHaveURL("/account/orders/BS-10392/items/ESV-ST-HC/review");
    await expect(main(page)).toContainText("Order BS-10392 · Delivered 18 Sep · Verified purchase");

    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Choose a rating from 1 to 5.")).toBeVisible();
    await page.getByLabel("5 stars").check();
    await page.getByLabel("Review title *", { exact: true }).fill("A study edition I use every day");
    await page.getByLabel("Review body *", { exact: true }).fill("Short");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Write at least 10 characters.")).toBeVisible();
    await page.getByLabel("Review body *", { exact: true }).fill("Clear notes, sturdy binding and readable type.");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page).toHaveURL("/account/reviews?status=submitted");
    await expect(page.getByRole("status").filter({ hasText: "Submission received / Pending" })).toContainText(
      "Your review is awaiting moderation.",
    );
    await expect(page.getByRole("row").filter({ hasText: "A study edition I use every day" })).toContainText("Pending");

    await page.goto("/products/esv-study-bible/reviews?sort=newest");
    await expect(page.getByText("A study edition I use every day")).toHaveCount(0);
    expect((await (await page.request.post("/api/__dev/reviews/approve")).json()) as unknown).toEqual({ approved: 1 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "A study edition I use every day" })).toBeVisible();
    await expect(page.getByText("Jordan L. · Verified purchase").first()).toBeVisible();
  });

  test("not delivered: writing disabled with links; delete asks first", async ({ page }) => {
    await signInAs(page, "customer");
    await page.goto("/account/orders/BS-10428/items/ESV-ST-HC/review");
    await expect(main(page)).toContainText("You can review an item once its order has been delivered.");
    await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View order" })).toHaveAttribute("href", "/account/orders/BS-10428");

    await page.goto("/account/reviews");
    await page.getByRole("button", { name: "Delete review of NIV Everyday Bible" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete review confirmation" });
    await expect(dialog).toContainText("Delete your published review of NIV Everyday Bible? This removes its public display.");
    await dialog.getByRole("button", { name: "Keep review" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Useful everyday edition" })).toBeVisible();
    await page.getByRole("button", { name: "Delete review of NIV Everyday Bible" }).click();
    await dialog.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Useful everyday edition" })).toHaveCount(0);
  });
});
