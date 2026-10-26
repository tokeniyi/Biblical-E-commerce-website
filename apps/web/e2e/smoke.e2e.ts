import { expect, test } from "@playwright/test";
import {
  SCENARIO_COOKIE,
  chooseInToolbar,
  getDevState,
  getSession,
  openDevTools,
  postFromPage,
  resetStore,
  scenarioCookie,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetStore(page);
});

test.describe("app boots and shells render", () => {
  test("home renders the storefront shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "C01 / Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "BIBLE STORE" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search Bibles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart (0)" })).toBeVisible();
    const primary = page.getByRole("navigation", { name: "Primary" });
    await expect(primary.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("contentinfo")).toContainText("Wireframe only");
  });

  test("account pages use the account sidebar", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1, name: "A07 / Account overview" })).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Account menu" });
    await menu.getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL("/account/orders");
    await expect(page.getByRole("heading", { level: 1, name: "A10 / Orders" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
  });

  test("admin pages use the separate admin shell", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "BIBLE STORE / ADMIN" })).toBeVisible();
    await expect(page.getByText("Not signed in as staff")).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Admin menu" });
    await menu.getByRole("link", { name: "Products" }).click();
    await expect(page).toHaveURL("/admin/products");
    await expect(page.getByRole("heading", { level: 1, name: "B03 / Products" })).toBeVisible();
  });

  test("unknown routes return 404", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-route");
    expect(res?.status()).toBe(404);
  });
});

test.describe("basic navigation", () => {
  test("header links reach each storefront section", async ({ page }) => {
    await page.goto("/");
    const primary = page.getByRole("navigation", { name: "Primary" });
    const cases = [
      { link: "Categories", url: "/categories", heading: "C02 / Category directory" },
      { link: "Study Bibles", url: "/categories/study", heading: "C03 / Browse Bibles" },
      { link: "Children", url: "/categories/children", heading: "C03 / Browse Bibles" },
      { link: "Help", url: "/help/shipping-returns", heading: "Help" },
      { link: "Home", url: "/", heading: "C01 / Home" },
    ];
    for (const c of cases) {
      await primary.getByRole("link", { name: c.link, exact: true }).click();
      await expect(page).toHaveURL(c.url);
      await expect(page.getByRole("heading", { level: 1, name: c.heading })).toBeVisible();
      await expect(primary.getByRole("link", { name: c.link, exact: true })).toHaveAttribute("aria-current", "page");
    }
    await page.getByRole("link", { name: "Cart (0)" }).click();
    await expect(page).toHaveURL("/cart");
    await expect(page.getByRole("heading", { level: 1, name: "O01 / Your cart" })).toBeVisible();
  });

  test("header search submits q to the search route", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search Bibles" }).fill("study bible");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/search?q=study+bible");
    await expect(page.getByRole("heading", { level: 1, name: "C04 / Search results" })).toBeVisible();
  });

  test("footer help links reach the help route", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Shipping & returns" }).click();
    await expect(page).toHaveURL("/help/shipping-returns");
  });
});

test.describe("dev toolbar drives the mock server", () => {
  test("identity switch changes what the server renders", async ({ page }) => {
    await page.goto("/admin");
    await chooseInToolbar(page, "Identity", "staff:admin");
    await page.reload();
    await expect(page.getByText("Staff: Alex · Admin")).toBeVisible();

    await chooseInToolbar(page, "Identity", "staff:fulfillment");
    await page.reload();
    await expect(page.getByText("Staff: Frankie · Fulfillment")).toBeVisible();

    // Sign out from the admin shell ends the session server-side.
    await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/admin/login");
    const session = await getSession(page);
    expect(session).toMatchObject({ session: { kind: "anonymous" }, expired: false });
  });

  test("expire session marks the session expired, not signed out (E11)", async ({ page }) => {
    await page.goto("/");
    await chooseInToolbar(page, "Identity", "customer");
    expect((await getSession(page)).session.kind).toBe("customer");
    await page.getByRole("button", { name: "Expire session now" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Session expired" })).toBeVisible();
    const after = await getSession(page);
    expect(after).toMatchObject({ session: { kind: "anonymous" }, expired: true });
  });

  test("scenario flags persist, are shown, and clear", async ({ page }) => {
    await page.goto("/");
    await chooseInToolbar(page, "Payment outcome", "declined");
    await expect(page.getByTestId("active-flag")).toHaveText(["payment:declined"]);
    expect(await scenarioCookie(page)).toBe("payment%3Adeclined");

    await page.reload();
    await expect(page.getByTestId("active-flag")).toHaveText(["payment:declined"]);
    await expect(page.getByRole("button", { name: "Dev tools · 1 active" })).toBeVisible();

    await openDevTools(page);
    await page.getByRole("button", { name: "Clear scenario" }).click();
    await expect(page.getByTestId("active-flag")).toHaveCount(0);
    const state = await getDevState(page);
    expect(state.scenario.payment).toBe("paid");
  });

  test("?scenario= URL presets are stored and the URL is cleaned", async ({ page }) => {
    await page.goto("/cart?scenario=promo:expired,order:shipped");
    await expect(page).toHaveURL("/cart");
    await expect(page.getByTestId("active-flag")).toHaveText(["promo:expired", "order:shipped"]);
    const state = await getDevState(page);
    expect(state.scenario).toMatchObject({ promo: "expired", order: "shipped" });
  });

  test("one-shot fail-write fires exactly once, even with a stale cookie", async ({ page, context }) => {
    await page.goto("/?scenario=network:fail-write");
    const stale = await scenarioCookie(page);
    expect(stale).toMatch(/^network%3Afail-write~[0-9a-f]{8}$/);

    expect(await postFromPage(page, "/api/session/logout")).toEqual({ status: 503, failure: "1" });
    expect(await postFromPage(page, "/api/session/logout")).toEqual({ status: 200, failure: null });

    // Server-side fetches can't clear the browser cookie; replaying the stale
    // cookie must not fire the fault again.
    await context.addCookies([{ name: SCENARIO_COOKIE, value: stale ?? "", url: page.url() }]);
    expect(await postFromPage(page, "/api/session/logout")).toEqual({ status: 200, failure: null });
  });

  test("reset store reseeds the server and clears this browser's state", async ({ page, context }) => {
    await page.goto("/?scenario=network:fail-write");
    const stale = await scenarioCookie(page);
    expect((await postFromPage(page, "/api/session/logout")).status).toBe(503);
    await chooseInToolbar(page, "Identity", "customer");

    await page.getByRole("button", { name: "Reset store" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Store reset and reseeded" })).toBeVisible();
    expect((await getSession(page)).session.kind).toBe("anonymous");
    expect(await scenarioCookie(page)).toBeUndefined();

    // The consumed-flag record lives in the store: after a real reseed the
    // same token fires again. A cookie-only "reset" would fail this.
    await context.addCookies([{ name: SCENARIO_COOKIE, value: stale ?? "", url: page.url() }]);
    expect((await postFromPage(page, "/api/session/logout")).status).toBe(503);
  });
});

test.describe("dev pages", () => {
  test("/__dev/screens lists all 48 screens and every route serves its screen", async ({ page }) => {
    test.setTimeout(600_000);
    await page.goto("/__dev/screens");
    await expect(page.getByRole("heading", { level: 1, name: "Screens (48)" })).toBeVisible();
    const rows = page.getByTestId("screen-row");
    await expect(rows).toHaveCount(48);

    const links = await rows.evaluateAll((trs) =>
      trs.map((tr) => ({
        id: tr.querySelector("td")?.textContent ?? "",
        href: tr.querySelector("a")?.getAttribute("href") ?? "",
      })),
    );
    expect(new Set(links.map((l) => l.id)).size).toBe(48);
    for (const { id, href } of links) {
      const res = await page.request.get(href);
      expect(res.status(), `${id} ${href}`).toBe(200);
      expect(await res.text(), `${id} ${href}`).toContain(`${id} / `);
    }
  });

  test("/__dev/states lists E01 to E25", async ({ page }) => {
    await page.goto("/__dev/states");
    const ids = await page.getByTestId("state-row").locator("td:first-child").allTextContents();
    expect(ids).toEqual(Array.from({ length: 25 }, (_, i) => `E${String(i + 1).padStart(2, "0")}`));
  });

  test("/__dev/inbox shows the empty state on a fresh store", async ({ page }) => {
    await page.goto("/__dev/inbox");
    await expect(page.getByRole("heading", { level: 1, name: "Dev Inbox (0)" })).toBeVisible();
    await expect(page.getByText("No messages yet.")).toBeVisible();
  });
});
