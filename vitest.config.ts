import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/index.ts", "**/__tests__/**"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    environment: "node",

    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,

    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],

    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
  },
});
