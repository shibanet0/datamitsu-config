import configConventional from "@commitlint/config-conventional";
import { type UserConfig } from "@commitlint/types";
import { fileURLToPath } from "node:url";

/**
 * Every rule is an error, or it is off — the rule this package applies to ESLint, oxlint and knip,
 * applied to the third tool that ships a preset with warnings in it.
 *
 * `@commitlint/config-conventional` leaves `body-leading-blank` and `footer-leading-blank` at level
 * 1, and a level-1 rule prints a warning and exits 0: a commit message whose body runs straight on
 * from the subject passed. Raised here rather than with `--strict` in the hook, so the answer is
 * the same wherever commitlint is run from — the hook, an editor, or by hand.
 */
type Rules = NonNullable<UserConfig["rules"]>;

const raiseWarningsToErrors = (rules: Rules): Rules =>
  Object.fromEntries(
    Object.entries(rules).map(([name, entry]) =>
      Array.isArray(entry) && entry[0] === 1 ? [name, [2, ...entry.slice(1)]] : [name, entry],
    ),
  ) as Rules;

const baseConfig = {
  ...configConventional,
  formatter: fileURLToPath(import.meta.resolve("@commitlint/format")),
  parserPreset: fileURLToPath(import.meta.resolve("conventional-changelog-conventionalcommits")),
  rules: raiseWarningsToErrors(configConventional.rules),
} satisfies UserConfig;

export const defineConfig = (
  overrides?: ((base: UserConfig) => UserConfig) | UserConfig,
): UserConfig =>
  typeof overrides === "function" ? overrides(baseConfig) : { ...baseConfig, ...overrides };
