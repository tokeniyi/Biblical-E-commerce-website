import { defineConfig } from "vitest/config";
import path from "path";

const nextMockPath = path.resolve(__dirname, "test/__mocks__/next-modules.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
      "next/server": nextMockPath,
      "next/headers": nextMockPath,
      "next/navigation": nextMockPath,
    },
  },
  optimizeDeps: {
    exclude: ["next-auth"],
  },
  ssr: {
    noExternal: ["next-auth"],
  },
  plugins: [
    {
      name: "next-mocks",
      resolveId(id, importer) {
        if (id === "next/server" || id === "next/headers" || id === "next/navigation") {
          return nextMockPath;
        }
        return null;
      },
    },
  ],
  test: { passWithNoTests: true, setupFiles: ["./test/setup.ts"] },
});
