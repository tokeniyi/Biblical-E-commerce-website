/** @type {import('next').NextConfig} */
const nextConfig = {
  // packages/shared ships TypeScript source, so Next must compile it.
  transpilePackages: ['@your-app/shared'],
  turbopack: {
    resolveAlias: {
      '@': require('path').resolve(__dirname, './src'),
      '@shared': require('path').resolve(__dirname, '../../packages/shared/src'),
    },
  },
};

module.exports = nextConfig;
