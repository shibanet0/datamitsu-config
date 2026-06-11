import type { KnipConfiguration } from "knip";
export type * from "knip";

const baseConfig: KnipConfiguration = {
  entry: ["src/index.ts"],
  project: ["src/**/*.ts"],
};

export const defineConfig = (
  overrides?: ((base: KnipConfiguration) => KnipConfiguration) | KnipConfiguration,
): KnipConfiguration =>
  typeof overrides === "function" ? overrides(baseConfig) : { ...baseConfig, ...overrides };
