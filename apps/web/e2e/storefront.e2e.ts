import { expect, test, type Page } from "@playwright/test";
import { chooseInToolbar, resetStore } from "./helpers";

/**
 * Phase 1 exit criteria (spec §9): browse / filter / search / variant /
 * cart-add / saved flows, plus E02, E05, E12, E16, E18, E19 reached in the
 * real flow rather than only in the gallery.
 */

test.beforeEach(async ({ page }) => {
  await resetStore(page);
});

const results = (page: Page) => page.getByTestId("product-card").getByRole("heading", { level: 3 });
const count = (page: Page) => page.getByRole("main").getByRole("status").first();

test.describe("browse", () => {
  test("C01 → C02 → C03: categories are links with server counts", async ({ page }) => {
    await page.goto("/");
    await expect(results(page)).toHaveText(["ESV Study Bible", "NIV Everyday Bible", "KJV Large Print Bible"]);
    await page.getByRole("link", { name: "Browse categories" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Category directory" })).toBeVisible();
    const purpose = page.getByRole("region", { name: "By purpose" });
    await expect(purpose.getByRole("link")).toHaveText([
      "Study Bibles · 24 editions",
      "Devotional Bibles · 18 editions",
      "Children’s Bibles · 12 editions",
      "Journaling Bibles · 16 editions",
      "Explore study editions",
    ]);
    await page.getByRole("region", { name: "By translation" }).getByRole("link", { name: "Browse ESV" }).click();
    await expect(page).toHaveURL("/categories/bibles?translation=ESV");
    await expect(page.getByRole("checkbox", { name: "ESV" })).toBeChecked();
    for (const line of await page.getByTestId("product-card").locator("p").first().allTextContents()) {
      expect(line).toMatch(/^ESV · /);
    }
  });

  test("C03: 24 Bibles in stock, 3 per page, NLT sold-out hint", async ({ page }) => {
    await page.goto("/categories/bibles");
    await expect(page.getByRole("heading", { level: 1, name: "Browse Bibles" })).toBeVisible();
    await expect(count(page)).toHaveText("24 Bibles in stock");
    await expect(page.getByText("Showing 1–3 of 24 Bibles · 3 per page")).toBeVisible();
    await expect(page.getByText("Active filters:")).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter: English" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter: In stock" })).toBeVisible();

    await page.getByRole("link", { name: "Clear “In stock”" }).click();
    await expect(page).toHaveURL("/categories/bibles?availability=all");
    await expect(count(page)).toHaveText("41 Bibles");
    await expect(page.getByRole("checkbox", { name: "In stock only" })).not.toBeChecked();
  });

  test("facets live in the URL, reset the page, and Back restores the query", async ({ page }) => {
    await page.goto("/categories/bibles");
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    await pagination.getByRole("link", { name: "Next ›" }).click();
    await expect(page).toHaveURL("/categories/bibles?page=2");
    await expect(page.getByText("Showing 4–6 of 24 Bibles · 3 per page")).toBeVisible();

    // A facet change resets to page 1.
    await page.getByRole("checkbox", { name: "NIV" }).check();
    await expect(page).toHaveURL("/categories/bibles?translation=NIV");
    await expect(page.getByText(/^Showing 1–/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter: NIV" })).toBeVisible();

    // Sort keeps filters.
    await page.getByLabel("Sort by").selectOption("price-desc");
    await expect(page).toHaveURL("/categories/bibles?translation=NIV&sort=price-desc");
    const prices = (await page.getByTestId("product-card").locator("p.font-semibold").allTextContents()).map((p) =>
      Number(p.replace(/[$,]/g, "")),
    );
    expect(prices).toEqual([...prices].sort((a, b) => b - a));

    // Removing a chip updates the URL and results.
    await page.getByRole("link", { name: "Remove filter: NIV" }).click();
    await expect(page).toHaveURL("/categories/bibles?sort=price-desc");
    await expect(page.getByRole("checkbox", { name: "NIV" })).not.toBeChecked();

    await page.goBack();
    await expect(page).toHaveURL("/categories/bibles?translation=NIV&sort=price-desc");
    await expect(page.getByRole("checkbox", { name: "NIV" })).toBeChecked();
    await expect(page.getByLabel("Sort by")).toHaveValue("price-desc");

    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page).toHaveURL("/categories/bibles");
    await expect(count(page)).toHaveText("24 Bibles in stock");
  });

  test("price inputs are debounced into one URL change", async ({ page }) => {
    await page.goto("/categories/bibles");
    await page.getByLabel("Maximum price in dollars").pressSequentially("25", { delay: 50 });
    await expect(page).toHaveURL("/categories/bibles?price=-25");
    await expect(page.getByRole("link", { name: "Remove filter: $0 — $25" })).toBeVisible();
    for (const p of await page.getByTestId("product-card").locator("p.font-semibold").allTextContents()) {
      expect(Number(p.replace("$", ""))).toBeLessThanOrEqual(25);
    }
  });

  test("large print is its own category from C01", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Browse Large Print" }).click();
    await expect(page).toHaveURL("/categories/large-print");
    await expect(results(page)).toHaveText(["KJV Large Print Bible"]);
  });
});

test.describe("search (C04)", () => {
  test("18 results for “bible”; q is kept with every facet; clear search → C01", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search Bibles" }).fill("bible");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/search?q=bible");
    await expect(count(page)).toHaveText("18 results for “bible”");
    await expect(page.getByText("Showing 1–3 of 18 results · 3 per page")).toBeVisible();

    await page.getByRole("checkbox", { name: "KJV" }).check();
    await expect(page).toHaveURL("/search?q=bible&translation=KJV");
    await expect(page.getByRole("searchbox", { name: "Search query" })).toHaveValue("bible");

    // A new search keeps the facets.
    await page.getByRole("searchbox", { name: "Search query" }).fill("large print");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL("/search?q=large+print&translation=KJV");
    await expect(results(page)).toHaveText(["KJV Large Print Bible"]);

    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page).toHaveURL("/");
  });

  test("E02: no matches keeps the query; clearing filters never erases it", async ({ page }) => {
    await page.goto("/search?q=spanish+study&translation=ESV&binding=Hardcover");
    await expect(page.getByRole("heading", { level: 2, name: "No Bibles match your search" })).toBeVisible();
    await expect(page.getByText("Active query / filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter: Hardcover" })).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL("/search?q=spanish+study");
    await expect(page.getByRole("searchbox", { name: "Search query" })).toHaveValue("spanish study");
    // Still nothing matches "spanish study", so E02 stays, with the query kept.
    const e02 = page.locator('[data-state="E02"]');
    await expect(e02.getByRole("link", { name: "Categories" })).toHaveAttribute("href", "/categories");
    await expect(e02.getByRole("link", { name: "Edit search" })).toHaveAttribute("href", "#search-query");
  });

  test("E18: a failed read shows the network error; Retry reloads the same query", async ({ page }) => {
    await page.goto("/search?q=bible&scenario=network:fail-read");
    await expect(page).toHaveURL("/search?q=bible");
    // Scoped to main: Next's route announcer is also role="alert".
    const main = page.getByRole("main");
    await expect(main.getByRole("alert")).toContainText("We couldn’t load this information");
    // Filters stay available.
    await expect(page.getByRole("heading", { name: "Filter Bibles" })).toBeVisible();
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(count(page)).toHaveText("18 results for “bible”");
    await expect(main.getByRole("alert")).toHaveCount(0);
  });

  test("E16: while results load, filters stay and the grid is busy", async ({ page }) => {
    await page.goto("/categories/bibles");
    await chooseInToolbar(page, /^Latency/, "4000");
    await page.getByRole("checkbox", { name: "ESV" }).check();
    await expect(page.getByRole("status").filter({ hasText: "Loading Bibles…" })).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    // The stale count is not shown as final.
    await expect(page.getByText("24 Bibles in stock")).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: "ESV" })).toBeChecked();
    await expect(page).toHaveURL("/categories/bibles?translation=ESV", { timeout: 15_000 });
    await expect(page.getByRole("status").filter({ hasText: "Loading Bibles…" })).toHaveCount(0, { timeout: 15_000 });
  });
});

test.describe("product, variant and cart (C05 → C07)", () => {
  test("add to cart opens the C07 drawer; focus is managed; header count updates", async ({ page }) => {
    await page.goto("/products/esv-study-bible?variant=ESV-ST-HC");
    await expect(page.getByRole("heading", { level: 1, name: "ESV Study Bible" })).toBeVisible();
    await expect(page.getByText("SKU ESV-ST-HC · ISBN 978-1-00000-001-1 · 12 available")).toBeVisible();
    await expect(page.getByText("Minimum 1 · maximum 12 for this variant")).toBeVisible();

    const add = page.getByRole("button", { name: "Add to cart" });
    await add.click();
    const drawer = page.getByRole("dialog", { name: "✓ Added to your cart" });
    await expect(drawer).toBeVisible();
    await expect(page).toHaveURL("/products/esv-study-bible?variant=ESV-ST-HC&cart=added");
    await expect(drawer.getByRole("button", { name: "Close ×" })).toBeFocused();
    await expect(drawer).toContainText("Quantity 1 · $39.00");
    await expect(drawer).toContainText("Cart: 1 item · Subtotal $39.00");
    await expect(page.getByRole("link", { name: "Cart (1)" })).toBeAttached();

    // Focus is trapped: the page behind is inert, so Tab only reaches the
    // drawer's controls (or the browser's own UI, which reads as <body>).
    const reached = new Set<string>();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const where = await drawer.evaluate((el) => {
        const active = document.activeElement;
        if (!active || active === document.body) return "browser";
        return `${el.contains(active) ? "drawer" : "OUTSIDE"}:${active.textContent}`;
      });
      expect(where).not.toMatch(/^OUTSIDE/);
      reached.add(where);
    }
    expect(reached).toContain("drawer:View cart");
    expect(reached).toContain("drawer:Checkout");

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(add).toBeFocused();
    await expect(page).toHaveURL("/products/esv-study-bible?variant=ESV-ST-HC");
  });

  test("C07 as drawn: NIV in the cart, add ESV → 2 items, $63.00, also NIV", async ({ page }) => {
    await page.goto("/products/niv-everyday-bible");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Continue shopping" }).click();
    await page.goto("/products/esv-study-bible");
    await page.getByRole("button", { name: "Add to cart" }).click();
    const drawer = page.getByRole("dialog", { name: "✓ Added to your cart" });
    await expect(drawer).toContainText("Cart: 2 items · Subtotal $63.00");
    await expect(drawer).toContainText("Also in cart: NIV Everyday Bible × 1 · $24.00");
    await expect(drawer.getByRole("link", { name: "View cart" })).toHaveAttribute("href", "/cart");
    await expect(drawer.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout/identity");
  });

  test("quantity is capped at what is available, counting the cart (server-checked)", async ({ page }) => {
    await page.goto("/products/kjv-large-print-bible");
    const qty = page.getByRole("spinbutton", { name: "Quantity" });
    await qty.fill("50");
    await expect(qty).toHaveValue("8");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Close ×" }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Only 8 available, and 8 already in your cart.");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("E12: an unavailable combination stays selected, can't be bought, and offers a valid variant", async ({ page }) => {
    await page.goto("/products/esv-study-bible?variant=ESV-ST-HC");
    await page.getByLabel("Binding").selectOption("Leather-look");
    await page.getByLabel("Print size").selectOption("Large print");
    await expect(page).toHaveURL("/products/esv-study-bible?variant=ESV-ST-LL-LP");
    await expect(page.getByText("Leather-look / Large print — unavailable")).toBeVisible();
    await expect(page.getByText("Hardcover / Standard is in stock: 12 · $39.00.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Browse large print" })).toHaveAttribute("href", "/categories/large-print");

    await page.getByRole("button", { name: "Select available variant" }).click();
    await expect(page).toHaveURL("/products/esv-study-bible?variant=ESV-ST-HC");
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });

  test("E12 direct link: the draft variant cannot be added even through the API", async ({ page }) => {
    await page.goto("/products/esv-study-bible?variant=ESV-ST-LL-LP");
    await expect(page.getByText("Leather-look / Large print — unavailable")).toBeVisible();
    const res = await page.request.post("/api/cart/lines", { data: { sku: "ESV-ST-LL-LP", quantity: 1 } });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "variant_unavailable" } });
  });

  test("E05: sold out disables add, offers alternatives and the wishlist", async ({ page }) => {
    await page.goto("/products/nlt-childrens-bible");
    await expect(page.getByText("Out of stock · Hardcover · SKU NLT-CH-HC")).toBeVisible();
    await expect(page.getByText("Disabled — out of stock")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
    await page.getByRole("link", { name: "Find alternatives" }).click();
    await expect(page).toHaveURL("/categories/children");
  });

  test("E19: unknown and draft products are the same 404", async ({ page }) => {
    for (const path of ["/products/missing", "/products/esv-journaling-bible"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "We can’t find that page" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Browse categories" }).click();
    await expect(page).toHaveURL("/categories");
  });
});

test.describe("wishlist ♡", () => {
  // Jordan's wishlist is seeded as drawn in A12 (ESV, NIV, KJV, NLT Children’s), so these use another edition.
  test("signed out → sign in with returnTo and the SKU; signed in → saved", async ({ page }) => {
    await page.goto("/categories/bibles?translation=NLT");
    const save = page.getByRole("link", { name: "♡ Save NLT Thinline Bible (sign in to save)" });
    await expect(save).toHaveAttribute("href", "/login?returnTo=%2Fcategories%2Fbibles%3Ftranslation%3DNLT&save=NLT-TH04-HA");

    await chooseInToolbar(page, "Identity", "customer");
    await page.reload();
    await page.getByRole("button", { name: "♡ Save NLT Thinline Bible" }).click();
    await expect(page.getByText("♥ Saved").first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "View wishlist" }).first()).toHaveAttribute("href", "/account/wishlist");
  });

  test("after sign-in, returnTo brings the customer back with the tapped ♡ saved (owner decision)", async ({ page }) => {
    await page.goto("/categories/bibles?translation=NLT");
    await page.getByRole("link", { name: "♡ Save NLT Thinline Bible (sign in to save)" }).click();
    await expect(page).toHaveURL("/login?returnTo=%2Fcategories%2Fbibles%3Ftranslation%3DNLT&save=NLT-TH04-HA");

    await page.getByLabel("Email *", { exact: true }).fill("jordan@example.com");
    await page.getByLabel("Password *", { exact: true }).fill("wireframe-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/categories/bibles?translation=NLT");
    await expect(page.getByRole("button", { name: "♡ Save NLT Thinline Bible" })).toHaveCount(0);
    await expect(page.getByText("♥ Saved").first()).toBeVisible();
    const { skus } = (await (await page.request.get("/api/wishlist")).json()) as { skus: string[] };
    expect(skus).toContain("NLT-TH04-HA");
  });

  test("an expired session sends the customer to A14 with returnTo", async ({ page }) => {
    await page.goto("/products/nlt-thinline-bible-04");
    await chooseInToolbar(page, "Identity", "customer");
    await page.reload();
    // Expire it behind the page's back: the page still shows the signed-in ♡ button.
    expect((await page.request.post("/api/__dev/session/expire")).status()).toBe(200);
    await page.getByRole("button", { name: "♡ Wishlist NLT Thinline Bible" }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fproducts%2Fnlt-thinline-bible-04.*&reason=session-expired/);
    await expect(page.getByRole("heading", { level: 1, name: "Please sign in to continue" })).toBeVisible();
  });
});

test.describe("reviews (C06)", () => {
  test("124 reviews, filter and sort in the URL; signed out gets sign-in guidance", async ({ page }) => {
    await page.goto("/products/esv-study-bible");
    await page.getByRole("link", { name: "4.8 / 5 · 124 verified reviews" }).click();
    await expect(page).toHaveURL("/products/esv-study-bible/reviews");
    await expect(page.getByRole("heading", { name: "4.8 / 5 from 124 reviews" })).toBeVisible();
    await expect(page.getByText("Showing 1–2 of 124 reviews")).toBeVisible();
    await expect(page.getByTestId("review").getByRole("heading")).toContainText([
      "Clear notes and sturdy binding",
      "Useful maps",
    ]);
    await expect(page.getByText("Taylor M. · Verified purchase · 24 Sep 2026 · Hardcover / Standard")).toBeVisible();

    await page.getByLabel("Rating filter").selectOption("4");
    await expect(page).toHaveURL("/products/esv-study-bible/reviews?rating=4");
    await expect(page.getByText("Showing 1–2 of 19 reviews")).toBeVisible();

    await expect(page.getByRole("link", { name: "Write a review" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fproducts%2Fesv-study-bible%2Freviews%3Frating%3D4",
    );
  });

  test("Jordan received the ESV in BS-10392, so Write a review leads to A13", async ({ page }) => {
    await page.goto("/products/esv-study-bible/reviews");
    await chooseInToolbar(page, "Identity", "customer");
    await page.reload();
    await expect(page.getByRole("link", { name: "Write a review" })).toHaveAttribute(
      "href",
      "/account/orders/BS-10392/items/ESV-ST-HC/review",
    );
  });
});

test.describe("saved for later (C08)", () => {
  test("move rechecks stock: in stock → C07 drawer; sold out → stays saved (E05)", async ({ page }) => {
    await page.goto("/__dev/screens");
    await page.getByRole("button", { name: "Saved for later" }).click();
    await expect(page).toHaveURL("/cart/saved");
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(3);
    await expect(table).toContainText("$22.00 · Out of stock");
    await expect(table.getByRole("link", { name: "View alternatives to NLT Children’s Bible" })).toHaveAttribute(
      "href",
      "/categories/children",
    );

    // The NLT went out of stock before this page could offer "Move"; the server refuses even if asked.
    const refused = await page.request.post("/api/cart/saved/NLT-CH-HC/move");
    expect(await refused.json()).toMatchObject({ error: { code: "out_of_stock" } });
    await page.reload();
    await expect(table).toContainText("NLT Children’s Bible");

    await table.getByRole("button", { name: "Move to cart: KJV Large Print Bible" }).click();
    await expect(page).toHaveURL("/products/kjv-large-print-bible?variant=KJV-LP-LL&cart=added");
    const drawer = page.getByRole("dialog", { name: "✓ Added to your cart" });
    await expect(drawer).toContainText("Cart: 3 items");
    await page.goto("/cart/saved");
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  });

  test("remove asks first; Keep item changes nothing; focus returns", async ({ page }) => {
    await page.goto("/__dev/screens");
    await page.getByRole("button", { name: "Saved for later" }).click();
    const remove = page.getByRole("button", { name: "Remove: KJV Large Print Bible" });
    await remove.click();
    const dialog = page.getByRole("dialog", { name: "Remove saved item" });
    await expect(dialog).toContainText(
      "Remove KJV Large Print Bible from saved items? This does not affect items already in your cart.",
    );
    await expect(dialog.getByRole("button", { name: "Keep item" })).toBeFocused();
    await dialog.getByRole("button", { name: "Keep item" }).click();
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();

    await remove.click();
    await dialog.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("table")).not.toContainText("KJV Large Print Bible");
    // Cart lines are untouched.
    await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  });
});
