import configConventional from "@commitlint/config-conventional";
import { type UserConfig } from "@commitlint/types";
import { fileURLToPath } from "node:url";

const baseConfig = {
  ...configConventional,
  formatter: fileURLToPath(import.meta.resolve("@commitlint/format")),
  parserPreset: fileURLToPath(import.meta.resolve("conventional-changelog-conventionalcommits")),
} satisfies UserConfig;

export const defineConfig = (
  overrides?: ((base: UserConfig) => UserConfig) | UserConfig,
): UserConfig =>
  typeof overrides === "function" ? overrides(baseConfig) : { ...baseConfig, ...overrides };
