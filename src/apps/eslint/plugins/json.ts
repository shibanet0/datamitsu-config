import type { TypedFlatConfigItem } from "../types";

import { GLOB_JSON } from "../globs";

/**
 * Scoped to {@link GLOB_JSON}, which the commented-out block below this always intended.
 *
 * Without it the `json/json` rule was registered globally — nominally running on every `.ts` file
 * and, once the composer started ignoring JSON in unscoped blocks, on everything _except_ the files
 * it exists for.
 */
export async function json(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-json");

  return [
    {
      files: [GLOB_JSON],
      name: "s0/json/rules",
      plugins: {
        json: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
  ];
}
