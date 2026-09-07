# Monorepo Structure

## Packages
apps/ web/ - Next.js frontend (deployed to Vercel) api/ - NestJS backend (deployed to Railway/Fly.io) packages/ shared/ - Zod schemas and TypeScript types shared by both apps


## Why `packages/shared` Exists

Both `apps/web` and `apps/api` need to agree on payload shapes (User, Transaction,
Auth JWT, etc.). `packages/shared` is the single source of truth:

- Zod schemas for runtime validation
- TypeScript types inferred from those schemas
- Both apps import from here instead of redefining shapes independently

If you change a payload shape, change it here first. Both apps will stay in sync.

## pnpm Workspace Layout
pnpm-workspace.yaml packages:

"apps/*"
"packages/*"

Each workspace package gets its own isolated `node_modules/`. pnpm does not
symlink `devDependencies` across package boundaries.

## Turbo Pipeline

Turbo orchestrates tasks across packages. Key tasks:

| Task | Command | Depends on |
|------|---------|------------|
| `lint` | `eslint . --max-warnings 0` | - |
| `typecheck` | `tsc --noEmit` | - |
| `test` | `vitest run` / `jest ...` | `^build` |
| `build` | `next build` / `nest build` | `^build` |

`^build` means "wait for all dependencies to build first". So `apps/api` tests
wait for `packages/shared` to finish building.

## Adding a New Workspace Package

1. Create the package directory under `apps/` or `packages/`
2. Add it to `pnpm-workspace.yaml` if the glob doesn't already match
3. Add a `package.json` with `name`, `version`, `scripts`, `dependencies`
4. Add a `tsconfig.json` with `allowJs`, `allowDefaultProject` considerations
5. If it has a `lint` script, install ESLint deps locally (see LINTING.md)
6. If it has a `test` script, add `passWithNoTests: true` (see TESTING.md)
7. If it uses path aliases, update all 4 config files (see PATH-ALIASES.md)
