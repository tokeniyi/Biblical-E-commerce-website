# Linting

## Root-Level Flat Config

ESLint is configured once at the repo root in `eslint.config.mjs`. Every package
inherits this config automatically - ESLint walks up the directory tree from the
package's `cwd` until it finds a config file.

```js
// eslint.config.mjs
export default tseslint.config(
  // 1. Ignores
  { ignores: ["**/dist/**", "**/.next/**", "**/.turbo/**", "**/coverage/**", "**/node_modules/**"] },

  // 2. Base rules (all packages)
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        allowDefaultProject: true,
      },
    },
  },

  // 3. Next.js rules (apps/web only, scoped by cwd)
  ...(/[\\/]apps[\\/]web$/.test(process.cwd()) ? [nextPlugin rules] : []),

  // 4. Config file overrides (CommonJS globals)
  {
    files: ["**/jest.config.js", "**/next.config.js"],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },

  // 5. Unused-vars override (underscore prefix)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },

  // 6. Prettier (must be last)
  eslintConfigPrettier,
);
```

Why Each Package Installs Its Own ESLint
Turbo runs each package's lint script in that package's directory:

```bash
pnpm turbo run lint
# -> apps/web$ eslint .
# -> apps/api$ eslint .
# -> packages/shared$ eslint .
```

The shell resolves eslint from the package's own node_modules/.bin/. pnpm's strict layout does not symlink devDependencies across package boundaries, so packages/shared having eslint installed does not make it available to apps/web or apps/api.

Each package that has a lint script must have these in devDependencies:

```json
{
  "devDependencies": {
    "eslint": "^9.39.5",
    "@eslint/js": "^9.39.5",
    "typescript-eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0"
  }
}
```

Type-Aware Linting and projectService
The config uses typescript-eslint's projectService: true with tsconfigRootDir: __dirname. This tells ESLint to read each package's tsconfig.json and use it for type-aware rules (e.g. strictTypeChecked).

Each package's tsconfig.json must be reachable from the root and must include the files ESLint needs to lint.

allowDefaultProject: true
Files that don't match any tsconfig.json (e.g. .js config files at a package root) fall back to a default empty TypeScript project instead of throwing a "not found by the project service" error.

allowJs: true (required in packages with .js config files)
Packages that contain .js files (Jest configs, Next.js config) must set allowJs: true in their tsconfig.json. Without it, TypeScript's project service ignores .js files and ESLint can't type-check them.

Next.js Plugin Scoping
The @next/next plugin is only enabled when ESLint runs from apps/web:

```js
...(/[\\/]apps[\\/]web$/.test(process.cwd()) ? [nextPlugin rules] : [])
```

This is done natively (no FlatCompat) to avoid a circular-structure crash in eslint-plugin-react's flat config expansion.

Two rules are overridden for the scaffolding phase:

- `next/no-html-link-for-pages: "off"` - re-enable when apps/web/src/pages/ exists
- Pages directory notice is informational only; it does not count as a lint error

Prettier Integration
eslint-config-prettier is the last config in the chain. It turns off every ESLint rule that conflicts with Prettier's formatting, so ESLint owns code quality and Prettier owns style.

Never place any config block after eslintConfigPrettier.

Running Lint Locally
```bash
# All packages
pnpm turbo run lint

# Single package
pnpm --filter web lint
pnpm --filter api lint
pnpm --filter shared lint
```

All packages must pass with --max-warnings 0.
