import { dirname } from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/node_modules/**",
    ],
  },

  // Base JS rules + strict, type-aware TypeScript rules across the whole
  // monorepo (apps/web, apps/api, packages/shared all get this).
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Next.js-specific rules, registered natively (no FlatCompat) to avoid
  // a circular-structure crash caused by eslint-plugin-react's flat config
  // self-referencing when expanded through FlatCompat. Scoped to apps/web only.
  // Files are matched relative to ESLint's cwd (e.g. `eslint .` from apps/web),
  // so we only enable these rules when linting from the apps/web package root.
  ...(/[\\/]apps[\\/]web$/.test(process.cwd())
    ? [
        {
          files: ["**/*.{js,jsx,ts,tsx}"],
          plugins: {
            "@next/next": nextPlugin,
          },
          rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs["core-web-vitals"].rules,
          },
        },
      ]
    : []),

  // MUST be last: turns off every ESLint rule that fights with Prettier's
  // formatting, so Prettier owns style and ESLint only owns code quality.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }]
    }
  },

  eslintConfigPrettier,
);