# Linting

## Overview

ESLint runs in **flat config** mode (`eslint.config.mjs`) across the entire monorepo. Each package installs its own ESLint because pnpm's strict `node_modules` isolation means packages can't share root node_modules binaries, and Turbo runs lint per-package.

## Root Flat Config

`eslint.config.mjs` lives at the repo root and is referenced by every package's `lint` script (`eslint . --max-warnings 0`).

### Layer order (last wins for conflicting rules)

1. **Ignores** — `dist/`, `.next/`, `.turbo/`, `coverage/`, `node_modules/`
2. **Base JS rules** — `js.configs.recommended`
3. **TypeScript strict rules** — `tseslint.configs.strictTypeChecked`
4. **Type-aware options** — `projectService: true`, `tsconfigRootDir: __dirname`
5. **Next.js rules** — only when `process.cwd()` ends in `apps/web`
6. **Prettier** — `eslintConfigPrettier` (must be last to disable all ESLint formatting rules)

### TypeScript Project Service

```js
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
},
```

`projectService: true` lets `typescript-eslint` discover each package's `tsconfig.json` automatically. `tsconfigRootDir: __dirname` ensures it resolves relative to the config file location (the repo root), not the package being linted.

### Next.js Plugin Scoping

```js
...(/[\\/]apps[\\/]web$/.test(process.cwd())
  ? [{
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: { "@next/next": nextPlugin },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs["core-web-vitals"].rules,
      },
    }]
  : []),
```

The `@next/eslint-plugin-next` rules only activate when ESLint's `cwd` is `apps/web`. This is intentional — without it, the Next.js plugin would try to parse NestJS/Prisma files and fail.

**Why not FlatCompat?** The Next.js plugin's flat config self-references through `eslint-plugin-react`, which causes a circular-structure crash when expanded through FlatCompat. Using the plugin natively avoids this.

### Prettier Integration

`eslint-config-prettier` is the **last config in the chain**. It turns off every ESLint rule that conflicts with Prettier (indentation, quotes, semicolons, etc.), so Prettier owns formatting and ESLint only owns code quality.

## Per-Package ESLint Installs

Each workspace package must install ESLint and its plugins in its own `devDependencies`:

| Package | ESLint version | `@next/eslint-plugin-next` |
|---------|---------------|----------------------------|
| root (config owner) | ^9.39.5 | 16.3.4 |
| apps/web | ^10.10.0 | — |
| apps/api | ^10.10.0 | — |
| packages/shared | ^9.39.5 | — |

**Why each package installs its own ESLint:**
- ppnpm strict `node_modules` isolation — root `node_modules` isn't visible to workspace packages
- Turbo runs lint per-package, so each package needs its own binary

**Why versions differ:**
- Next.js 16 requires ESLint 9+ flat config, so `apps/web` uses ^10.10.0
- `packages/shared` and the root config file use ^9.39.5 (flat config compatible)
- `apps/api` uses ^10.10.0 for consistency with the Next.js ecosystem

## Running Lint

```bash
# All packages (Turbo)
pnpm lint

# Single package
pnpm --filter web lint
pnpm --filter api lint
pnpm --filter shared lint
```

## Adding Lint to a New Package

1. Install ESLint + plugins in the new package's `devDependencies`
2. Ensure the package's `lint` script is `"eslint . --max-warnings 0"`
3. If the package uses Next.js, the root config will auto-detect it via `process.cwd()`
4. If the package needs custom rules, add a config override in `eslint.config.mjs` scoped to the package's files
