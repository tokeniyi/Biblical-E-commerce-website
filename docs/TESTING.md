# Testing Infrastructure

## Test Runners Per Package

| Package | Runner | Config |
|---------|--------|--------|
| `apps/web` | Vitest | `apps/web/vitest.config.ts` |
| `apps/api` | Jest | `apps/api/test/unit/jest.config.js` |
| `packages/shared` | Vitest | default (no config file) |

## Why Each Package Needs Its Own Runner

- **Vitest** is the modern standard for Vite-powered projects and works natively with ESM/TypeScript. Used by `apps/web` and `packages/shared`.
- **Jest** is used by `apps/api` because NestJS's test tooling and existing ecosystem integrations (Prisma mocking, HTTP testing) work best with Jest's module system.

## `passWithNoTests`

Both runners **fail by default** when no test files match. In a monorepo where Turbo runs every package's test script, a package with zero tests must be configured to pass gracefully.

### Vitest

Add to `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { passWithNoTests: true },
});
```

`apps/web/vitest.config.ts` and any new Vitest-based package must include this.

### Jest

Add to `jest.config.js`:

```js
module.exports = {
  // ... existing config
  passWithNoTests: true,
};
```

Or pass the flag in `package.json`:

```json
"test": "jest --config ./test/unit/jest.config.js --passWithNoTests"
```

`apps/api/test/unit/jest.config.js` uses `passWithNoTests: true` directly in config.

## ts-jest Install Requirement

Jest's `transform` option requires the transformer package to be installed locally:

```js
transform: { "^.+\\.(t|j)s$": "ts-jest" }
```

Requires in `devDependencies`:

```bash
pnpm add -D ts-jest @types/jest
```

Missing transformer packages cause Jest to fail during config validation, before it even checks for test files.

## How Turbo Orchestrates Tests

`turbo.json` defines the test task:

```json
{
  "test": {
    "dependsOn": ["^build"],
    "outputs": ["coverage/**"]
  }
}
```

- **`dependsOn: ["^build"]`** — each package's tests run only after its dependencies have built. So `apps/api` tests wait for `packages/shared` to finish building.
- **`outputs: ["coverage/**"]`** — Turbo caches test results. If source code hasn't changed, Turbo replays cached test output instead of re-running.
- **Fails fast** — Turbo exits non-zero if any package's test script exits non-zero.

## Running Tests Locally

```bash
# All packages (Turbo, respects turbo.json dependency order)
pnpm test

# Single package
pnpm --filter web test
pnpm --filter api test
pnpm --filter shared test

# Watch mode (apps/web only)
pnpm --filter web test:watch
```

### `apps/api` Integration Tests

`apps/api` has a separate Jest config for integration tests that boot the real NestJS app:

```bash
pnpm --filter api test:integration
```

**Configuration (`apps/api/test/integration/jest.config.js`):**

- Uses ts-jest transform
- 30s `testTimeout` (app bootstrap is slow)
- `setupFiles: ["<rootDir>/test/setup.js"]` loads `.env.test` before any module initializes
- `passWithNoTests: true` so the package passes if no integration tests exist yet

**Why a separate config?** Integration tests start an HTTP server on an ephemeral port and make real requests. They need different timeouts and should not run on every `pnpm test` (they're slower).

**Jest Setup File Pattern**

If a NestJS module reads `process.env` at import time (e.g. `JwtStrategy` reading `AUTH_SECRET`), add a Jest `setupFiles` entry that loads `.env.test`:

```js
// apps/api/test/setup.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.test") });
```

This ensures env vars exist before any module constructor runs.

## How to Add a New Test File

### Vitest packages (apps/web, packages/shared)

1. Create a `.test.ts` or `.spec.ts` file anywhere in the package
2. Vitest auto-discovers it — no config change needed
3. If the package doesn't already have `passWithNoTests: true`, add it to `vitest.config.ts`

### Jest packages (apps/api)

#### Unit tests

1. Create a `.spec.ts` file under `apps/api/test/unit/` or `apps/api/src/`
2. Ensure it matches `testMatch` in `apps/api/test/unit/jest.config.js`
3. If the file uses path aliases (`@/`, `@shared/`), Jest's `moduleNameMapper` handles them — no extra config needed
4. If the test needs environment variables, add them to `apps/api/.env.test` or use `test/setup.js`

#### Integration tests

1. Create a `.spec.ts` file under `apps/api/test/integration/`
2. Use `apps/api/test/integration/jest.config.js` (separate config with longer timeout)
3. Bootstrap the real NestJS app with `NestFactory.create(AppModule)` and make HTTP requests through the full middleware stack
4. `test/setup.js` loads `.env.test` automatically

## CI Behavior

`.github/workflows/unit-tests.yml` runs on every push to non-main/staging branches:

```yaml
- name: Lint
  run: pnpm turbo run lint
- name: Typecheck
  run: pnpm turbo run typecheck
- name: Unit tests (web + api + shared)
  run: pnpm turbo run test
```

All three jobs must pass. A package with no tests passes only if `passWithNoTests` is configured.

## How We Got Here

- `apps/web` used Vitest without `passWithNoTests` → CI failed with `No test files found, exiting with code 1`
- `apps/api` used Jest with `ts-jest` transform but `ts-jest` was not installed → CI failed with `Module ts-jest in the transform option was not found`

Fixed by adding `passWithNoTests: true` to both runners and installing `ts-jest` + `@types/jest` in `apps/api`.
