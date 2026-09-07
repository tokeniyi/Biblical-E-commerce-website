# Monorepo Structure

## Package Map

```
apps/
  web/        Next.js frontend (deployed to Vercel)
  api/        NestJS backend (deployed to Railway/Fly.io)
packages/
  shared/     Zod schemas + TypeScript types shared by both apps
```

## pnpm Workspace

Defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

pnpm uses strict `node_modules` isolation — each workspace package gets its own `node_modules` and cannot access the root `node_modules`. This is why every package installs its own ESLint, TypeScript, and test runner binaries.

Workspace protocol (`workspace:*`) links local packages. `apps/web` and `apps/api` both depend on `@your-app/shared` via `"@your-app/shared": "workspace:*"`.

## Why `packages/shared` Exists

Both apps need to agree on the shape of every shared entity. Without a single source of truth:

- `apps/web` defines `User` one way, `apps/api` defines it slightly differently
- A payload change in one app breaks the other at runtime
- Zod validation logic is duplicated

`packages/shared` contains:
- Zod schemas for runtime validation
- TypeScript types derived from those schemas
- Any other pure logic both apps need (constants, utilities)

**Rule:** If a type or schema is used by more than one app, it lives in `packages/shared`.

## Turbo Pipeline

`turbo.json` defines task dependencies and outputs:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:integration": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

### Key behaviors

- **`^build`** — a package's `build` depends on its dependencies' `build` completing first. So `packages/shared` builds before `apps/web` and `apps/api`.
- **`test` depends on `^build`** — tests run after upstream packages have built, ensuring the latest shared code is available.
- **`test:integration` depends on `build`** (not `^build`) — integration tests only need the current package built, not upstream packages.
- **`dev` is persistent and uncached** — long-running dev servers shouldn't be cached or killed between Turbo runs.
- **`lint` and `typecheck` have no outputs** — Turbo doesn't cache these results.

### Running Turbo tasks

```bash
pnpm turbo run build     # Build all packages in dependency order
pnpm turbo run test      # Run tests in all packages
pnpm turbo run lint      # Lint all packages
pnpm turbo run typecheck # Typecheck all packages
```

Turbo exits non-zero if any package exits non-zero.

## Adding a New Workspace Package

1. Create the directory under `apps/` or `packages/`
2. Add a `package.json` with a `name` field
3. Add scripts for `build`, `lint`, `typecheck`, `test`
4. If the package depends on `@your-app/shared`, add `"@your-app/shared": "workspace:*"`
5. Run `pnpm install` — pnpm will auto-link the workspace dependency
6. If the package needs tests, configure the runner per `TESTING.md`
7. If the package needs linting, the root `eslint.config.mjs` covers it automatically
8. If the package needs path aliases, add them per `PATH-ALIASES.md`
9. If the package has a build step, Turbo will auto-detect it
