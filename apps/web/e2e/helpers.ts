import { expect, type Page } from "@playwright/test";

export const SCENARIO_COOKIE = "__scenario";

/** Reseed the mock store and clear this browser's cookies before a test. */
export async function resetStore(page: Page): Promise<void> {
  const res = await page.request.post("/api/__dev/reset");
  expect(res.status()).toBe(200);
  await page.context().clearCookies();
}

export async function openDevTools(page: Page): Promise<void> {
  const toggle = page.getByRole("button", { name: /^Dev tools/ });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(page.getByRole("region", { name: "Dev tools" })).toBeVisible();
}

/** Change a toolbar select and wait for the server round trip to finish. */
export async function chooseInToolbar(page: Page, label: string | RegExp, value: string): Promise<void> {
  await openDevTools(page);
  const select = page.getByRole("region", { name: "Dev tools" }).getByLabel(label);
  // Wait until the toolbar has loaded state (selects are disabled until then).
  await expect(select).toBeEnabled();
  await select.selectOption(value);
  // The toolbar announces "<label>: <value>" once the server confirmed it.
  await expect(page.getByRole("status").filter({ hasText: value })).toBeVisible();
  await expect(select).toBeEnabled();
  await expect(select).toHaveValue(value);
}

export async function scenarioCookie(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === SCENARIO_COOKIE)?.value;
}

type SessionBody = { session: { kind: string }; expired: boolean };
type DevStateBody = { scenario: Record<string, string> };

/** GET /api/session with this context's cookies. */
export async function getSession(page: Page): Promise<SessionBody> {
  return (await (await page.request.get("/api/session")).json()) as SessionBody;
}

export async function getDevState(page: Page): Promise<DevStateBody> {
  return (await (await page.request.get("/api/__dev/state")).json()) as DevStateBody;
}

/** POST from inside the page, so the browser's real cookies are sent. */
export async function postFromPage(page: Page, path: string): Promise<{ status: number; failure: string | null }> {
  return page.evaluate(async (url) => {
    const res = await fetch(url, { method: "POST" });
    return { status: res.status, failure: res.headers.get("x-mock-network-failure") };
  }, path);
}
