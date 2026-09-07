# Path Aliases

## Aliases

| Alias | Resolves to |
|-------|-------------|
| `@/` | `<package>/src/` |
| `@shared/` | `packages/shared/src/` |

## Config Per Tool

Path aliases must be registered in **every tool** that resolves imports. Missing one causes "module not found" errors at build, test, or typecheck time.

### tsconfig.json

Each package's `tsconfig.json` needs `baseUrl` and `paths`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

The `@shared/*` path is relative to the package root, so it climbs out of `apps/web` or `apps/api` into `packages/shared`.

### Next.js (apps/web only)

`apps/web/next.config.js` adds webpack aliases:

```js
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': require('path').resolve(__dirname, './src'),
    '@shared': require('path').resolve(__dirname, '../../packages/shared/src'),
  };
  return config;
},
```

Next.js compiles in the browser, so webpack needs to know about these aliases at build time.

### Vitest

`apps/web/vitest.config.ts` and any new Vitest config:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@shared': path.resolve(__dirname, '../../packages/shared/src'),
  },
},
```

### Jest

`apps/api/test/unit/jest.config.js` (and integration configs):

```js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
},
```

Note the regex capture group `(.*)` — Jest's `moduleNameMapper` uses regex patterns, so the alias must include a wildcard.

## Why Aliases Over Relative Paths

Relative paths like `../../../packages/shared/src/schemas` break when files move. Aliases stay stable regardless of file depth.

The tradeoff: you must update **4 configs** when adding or changing an alias, and your editor needs matching settings (see below).

## Editor Setup

VS Code needs the same paths to resolve imports during IntelliSense and go-to-definition. Add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

If IntelliSense doesn't resolve aliases, ensure the workspace TS version is selected (status bar shows it).

## Adding a New Alias

1. Add the mapping to every `tsconfig.json` in the monorepo
2. Add webpack alias to `apps/web/next.config.js`
3. Add Vitest alias to each `vitest.config.ts`
4. Add Jest mapping to each `jest.config.js`
5. Update `.vscode/settings.json` if needed
6. Update this file

**Do not skip any tool.** A missing config in one tool causes silent failures (e.g. tests pass but production build breaks).
