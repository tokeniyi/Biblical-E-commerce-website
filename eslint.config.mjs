import { dirname } from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FlatCompat lets us use eslint-config-next's shareable config (still
// published in the pre-flat "extends" string format) inside a flat config.
// This is the same pattern Next.js's own `create-next-app` generates.
const compat = new FlatCompat({ baseDirectory: __dirname });

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
        // "Project Service" (stable since typescript-eslint 8) auto-discovers
        // the nearest tsconfig.json per file - the recommended approach for
        // monorepos, instead of manually listing every package's tsconfig.
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Next.js-specific rules (core web vitals, image/link/script rules,
  // server/client boundary checks) - scoped ONLY to apps/web so NestJS
  // and the shared package aren't linted against browser-app rules.
  ...compat.extends("next/core-web-vitals", "next/typescript").map((config) => ({
    ...config,
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
  })),

  // MUST be last: turns off every ESLint rule that fights with Prettier's
  // formatting, so Prettier owns style and ESLint only owns code quality.
  eslintConfigPrettier,
);