import type { TypedFlatConfigItem } from "../types";

import { GLOB_JSON, GLOB_JSON5, GLOB_JSONC } from "../globs";

/**
 * The JSON linter, scoped so its rules reach the files they exist for.
 *
 * Both upstream presets are three blocks: a plugin registration, a `files`-scoped block that
 * installs the `jsonc/x` language, and a third that carries all the actual rules with **no `files`
 * at all**. That third shape is exactly what `composer.setDefaultIgnores` targets, so it was being
 * stamped with `ignores: ["**\/*.json", "**\/*.json5", "**\/*.jsonc", …]` — the four globs it
 * exists for. The language block scoped itself and survived; the rule block did not, and 28 rules
 * were off on JSON and on everywhere else.
 *
 * Measured before the fix: `{"a": 1, "a": +3}` in a `.json` file reported nothing, while the preset
 * alone reports `no-dupe-keys`, `no-plus-sign` and `valid-json-number`. Inverted, those same rules
 * resolved _on_ for `.ts` files, where they can never match.
 *
 * Scoping every rule-bearing block here rather than opting out of the default ignores: the rules
 * are for these three extensions and nothing else, so saying so is both the fix and the
 * documentation.
 */
export async function jsonc(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-jsonc");

  return [
    ...plugin.configs["flat/recommended-with-jsonc"],
    ...plugin.configs["flat/recommended-with-json5"],
  ].map((block) =>
    block.rules && !block.files ? { ...block, files: [GLOB_JSON, GLOB_JSON5, GLOB_JSONC] } : block,
  ) as TypedFlatConfigItem[];
}
