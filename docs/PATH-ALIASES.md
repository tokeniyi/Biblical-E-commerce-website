# Path Aliases

## Aliases

| Alias | Resolves to | Used for |
|-------|-------------|----------|
| `@/*` | `./src/*` (per-package) | Internal imports within each app |
| `@shared/*` | `../../packages/shared/src/*` | Imports from the shared Zod schemas package |

## Example

```ts
// Before (relative paths)
import { UserSchema } from '../../packages/shared/src/schemas/user.schema';
import { authService } from '../../../src/services/auth.service';

// After (aliases)
import { UserSchema } from '@shared/schemas/user.schema';
import { authService } from '@/services/auth.service';
```

Config Files That Need Updates
When adding a new alias, update all four config files:

1. tsconfig.json (TypeScript)
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

2. apps/web/next.config.js (Next.js webpack)
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

3. apps/web/vitest.config.ts (Vitest)
```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@shared': path.resolve(__dirname, '../../packages/shared/src'),
  },
},
```

4. apps/api/test/unit/jest.config.js (Jest)
```js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
},
```

Also update apps/api/test/integration/jest.config.js with the same moduleNameMapper.

Editor Support
VS Code reads tsconfig.json automatically. No extra editor config is needed for IntelliSense and auto-imports to respect the aliases.

Tradeoffs
| Relative paths (../../) | Aliases (@/) |
|--------------------------|--------------|
| Works out of the box | Cleaner, easier to move files |
| Fragile - breaks when moving files | Requires config in 4+ files |
| Hard to read in deeply nested files | Standard convention in TS monorepos |

When to Add Aliases
Add aliases only when you actually need them. The project scaffolds fine without them. The cost is maintaining 4 config files per alias.
