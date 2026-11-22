import { expect, test, type Page } from "@playwright/test";
import { CONSENT_COOKIE, resetStore } from "./helpers";

/**
 * Full e-commerce journey on the high-fidelity storefront, plus the
 * consent-gated UX analytics (docs/ECOMMERCE_BUILD_PLAN.md §3.5, §4).
 */

async function clearConsent(page: Page): Promise<void> {
  await page.context().clearCookies({ name: CONSENT_COOKIE });
}

/** Live (non-demo) analytics events, read through the staff insights API. */
async function liveInsights(page: Page) {
  const res = await page.request.get("/api/admin/analytics?range=1d&demo=exclude");
  expect(res.status()).toBe(200);
  return (await res.json()) as {
    kpis: { sessions: number; pageViews: number };
    funnel: { step: string; sessions: number }[];
    searches: { query: string; zeroResults: number }[];
    topPages: { page: string }[];
  };
}

async function signInStaff(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email *").fill("alex@store.example");
  await page.getByLabel("Password *").fill("wireframe-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/admin");
}

test.beforeEach(async ({ page }) => {
  await resetStore(page);
});

test.describe("cookie consent", () => {
  test("banner offers equal Accept / Reject; nothing is tracked before a choice", async ({ page }) => {
    await clearConsent(page);
    const tracked: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/analytics/events")) tracked.push(r.url());
    });
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: "Help us improve the store" });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button", { name: "Accept analytics" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Reject analytics" })).toBeVisible();
    await page.getByRole("link", { name: "View Bible: ESV Study Bible" }).click();
    await expect(page).toHaveURL(/\/products\/esv-study-bible/);
    await page.waitForTimeout(500);
    expect(tracked).toHaveLength(0);
    const names = (await page.context().cookies()).map((c) => c.name);
    expect(names).not.toContain("_bs_vid");
  });

  test("reject: no analytics cookies, ingest refuses, banner stays dismissed", async ({ page }) => {
    await clearConsent(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Reject analytics" }).click();
    await expect(page.getByRole("dialog", { name: "Help us improve the store" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Help us improve the store" })).toHaveCount(0);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === CONSENT_COOKIE)?.value).toMatch(/analytics-denied/);
    expect(cookies.map((c) => c.name)).not.toContain("_bs_vid");
    const res = await page.request.post("/api/analytics/events", {
      data: { visitorId: "abcdefgh1", sessionId: "abcdefgh2", device: "desktop", events: [{ type: "page_view", path: "/", at: Date.now(), props: {} }] },
    });
    expect(res.status()).toBe(403);
  });

  test("accept → events recorded → withdraw via Cookie settings erases them", async ({ page, browser }) => {
    await clearConsent(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Accept analytics" }).click();
    await expect.poll(async () => (await page.context().cookies()).map((c) => c.name)).toContain("_bs_vid");
    await page.getByRole("link", { name: "Browse Study Bibles" }).click();
    await expect(page).toHaveURL("/categories/study");

    // Flush happens on a timer or when the page is hidden; wait for the batch.
    const visitor = (await page.context().cookies()).find((c) => c.name === "_bs_vid")?.value ?? "";
    expect(visitor).not.toBe("");

    const staff = await browser.newContext();
    const admin = await staff.newPage();
    await signInStaff(admin);
    await expect.poll(async () => (await liveInsights(admin)).kpis.pageViews, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    expect((await liveInsights(admin)).topPages.map((p) => p.page)).toContain("/categories/study");

    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings" }).click();
    await page.getByRole("dialog", { name: "Help us improve the store" }).getByRole("button", { name: "Reject analytics" }).click();
    await expect.poll(async () => (await page.context().cookies()).map((c) => c.name)).not.toContain("_bs_vid");
    await expect.poll(async () => (await liveInsights(admin)).kpis.pageViews, { timeout: 10_000 }).toBe(0);
    await staff.close();
  });
});

test.describe("full shopping journey", () => {
  test("home → category → product → cart → guest checkout → confirmation, tracked in insights", async ({ page, browser }) => {
    await clearConsent(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Accept analytics" }).click();

    // Search with no results (shows up as a zero-result search).
    await page.getByRole("searchbox", { name: "Search Bibles" }).fill("amplified");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/search?q=amplified");

    await page.goto("/");
    await page.getByRole("link", { name: "Browse Study Bibles" }).click();
    await expect(page).toHaveURL("/categories/study");
    await page.getByRole("link", { name: "View Bible: ESV Study Bible" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "ESV Study Bible" })).toBeVisible();

    // Gallery thumbnails switch the main image.
    await page.getByRole("button", { name: "Show back view" }).click();
    await expect(page.getByRole("img", { name: "ESV Study Bible back cover" })).toBeVisible();

    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL("/cart");
    await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();
    await page.getByRole("link", { name: "Checkout", exact: true }).click();

    await page.getByRole("link", { name: "Continue as guest" }).click();
    await page.getByLabel("Full name *", { exact: true }).fill("Jordan Lee");
    await page.getByLabel("Email *", { exact: true }).fill("guest@example.com");
    await page.getByLabel("Address line 1 *", { exact: true }).fill("24 Oak Street");
    await page.getByLabel("City *", { exact: true }).fill("Portland");
    await page.getByLabel("State *", { exact: true }).selectOption("OR");
    await page.getByLabel("ZIP code *", { exact: true }).fill("97205");
    await page.getByRole("button", { name: "Continue to delivery method" }).click();
    await expect(page).toHaveURL("/checkout/shipping");
    await page.getByRole("link", { name: "Continue to payment" }).click();
    await page.getByLabel("Card number *", { exact: true }).fill("4242 4242 4242 4242");
    await page.getByLabel("Expiry *", { exact: true }).fill("12 / 30");
    await page.getByLabel("Security code *", { exact: true }).fill("123");
    await page.getByLabel("I agree to the Terms and acknowledge the Privacy Policy.").check();
    await page.getByRole("button", { name: /^Pay \$/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Order confirmed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart (0)" })).toBeVisible();

    // The journey shows up in the insights funnel (live traffic only).
    const staff = await browser.newContext();
    const admin = await staff.newPage();
    await signInStaff(admin);
    await expect
      .poll(async () => (await liveInsights(admin)).funnel.find((s) => s.step === "Purchased")?.sessions ?? 0, { timeout: 20_000 })
      .toBe(1);
    const insights = await liveInsights(admin);
    expect(insights.funnel.map((s) => s.sessions)).toEqual([1, 1, 1, 1, 1]);
    expect(insights.searches).toContainEqual(expect.objectContaining({ query: "amplified", zeroResults: 1 }));

    await admin.goto("/admin/insights");
    await expect(admin.getByRole("heading", { level: 1, name: "UX insights" })).toBeVisible();
    await expect(admin.getByRole("heading", { name: "Recommended UX improvements" })).toBeVisible();
    await admin.getByLabel("Live visitors only (hide seeded demo traffic)").check();
    await expect(admin.getByRole("list", { name: "Key metrics" })).toContainText("Sessions");
    await staff.close();
  });

  test("register → account → sign out → sign in → order history and detail", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Check 3 fields")).toBeVisible();
    await page.getByLabel("Full name *").fill("Riley Stone");
    await page.getByLabel("Email *").fill("riley@example.com");
    await page.getByLabel("Password *").fill("a-long-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/account?welcome=1");
    await expect(page.getByRole("heading", { level: 1, name: "Hello, Riley" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hi, Riley" })).toBeVisible();

    await page.getByRole("navigation", { name: "Account menu" }).getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login\?reason=signed-out/);

    // Account pages redirect to sign-in with a safe returnTo.
    await page.goto("/account/orders");
    await expect(page).toHaveURL("/login?reason=required&returnTo=%2Faccount%2Forders");
    await page.getByLabel("Email *").fill("jordan@example.com");
    await page.getByLabel("Password *").fill("wrong-password!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don’t match an account.")).toBeVisible();
    await page.getByLabel("Password *").fill("wireframe-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/account/orders");
    await page.getByRole("link", { name: "View order BS-10392" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Order BS-10392" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Order progress" })).toContainText("Delivered");

    // Someone else's or an unknown order is a plain 404.
    const res = await page.goto("/account/orders/BS-99999");
    expect(res?.status()).toBe(404);
  });

  test("external returnTo is ignored after sign-in", async ({ page }) => {
    await page.goto("/login?returnTo=%2F%2Fevil.example%2Fsteal");
    await page.getByLabel("Email *").fill("jordan@example.com");
    await page.getByLabel("Password *").fill("wireframe-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/account");
  });

  test("wishlist: save from a card, then add to cart and remove on A12", async ({ page }) => {
    await page.goto("/login?returnTo=%2Fcategories%2Fstudy");
    await page.getByLabel("Email *").fill("jordan@example.com");
    await page.getByLabel("Password *").fill("wireframe-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/categories/study");
    await page.getByRole("button", { name: "♡ Save ESV Study Bible" }).click();
    await expect(page.getByText("♥ Saved")).toBeVisible();
    await page.goto("/account/wishlist");
    await page.getByRole("button", { name: "Add ESV Study Bible to cart" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Added ESV Study Bible" })).toBeVisible();
    await page.getByRole("button", { name: "Remove ESV Study Bible from wishlist" }).click();
    await expect(page.getByText("Your wishlist is empty.")).toBeVisible();
  });

  test("customers cannot read admin analytics; staff can", async ({ page }) => {
    expect((await page.request.get("/api/admin/analytics")).status()).toBe(401);
    await page.goto("/login");
    await page.getByLabel("Email *").fill("jordan@example.com");
    await page.getByLabel("Password *").fill("wireframe-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/account");
    expect((await page.request.get("/api/admin/analytics")).status()).toBe(403);
    await page.goto("/admin/insights");
    await expect(page.getByText("Staff access required")).toBeVisible();
  });
});
