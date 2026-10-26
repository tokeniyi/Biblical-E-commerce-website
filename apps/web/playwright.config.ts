import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${String(PORT)}`;

/**
 * E2E runs against a production build with mock tools on. Files are named *.e2e.ts so
 * Vitest (which picks up *.test/*.spec) never runs them.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  // Tests share one in-memory mock store, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // First hit on each route compiles it in dev mode, which is slow.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A production build, not `next dev`: dev compiles each route on first
  // hit, which made assertions time out on slow disks. Mock tools are
  // forced on (NEXT_PUBLIC_* is inlined at build time).
  webServer: {
    command: `pnpm exec next build && pnpm exec next start --port ${String(PORT)}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    env: { NEXT_PUBLIC_MOCK_TOOLS: "1" },
  },
});
