/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      '@': require('path').resolve(__dirname, './src'),
      '@shared': require('path').resolve(__dirname, '../../packages/shared/src'),
    },
  },
};

module.exports = nextConfig;
