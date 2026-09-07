import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { passWithNoTests: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});