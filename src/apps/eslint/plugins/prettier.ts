import type { TypedFlatConfigItem } from "../types";

/**
 * `eslint-config-prettier` is a config, not a plugin.
 *
 * Its `rules` map is rule name → `"off"`, not rule name → rule module, so registering it under
 * `plugins.prettier` never gave anything a `prettier/` prefix to resolve. At lint time it was
 * inert. Everything that walks `config.plugins` was not: the rule inventory read those 358 `"off"`
 * strings as if they were rules and wrote `prettier/@babel/semi`,
 * `prettier/@stylistic/array-bracket-newline` and 356 more into `rule-inventory.json` and
 * `KnownRuleName` — names that do not exist, that ESLint would reject if anything ever enabled
 * them, and that made every plugin bump's inventory diff noisier for no signal.
 *
 * Spreading the rules is the whole job: turn off the formatting rules prettier and oxfmt own, so
 * two tools do not fight over the same line.
 */
export async function prettier(): Promise<TypedFlatConfigItem[]> {
  const config = await import("eslint-config-prettier/flat");

  return [
    {
      name: "s0/prettier/rules",
      rules: {
        ...config.default.rules,
      },
    },
  ];
}
