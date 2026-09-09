import type { TypedFlatConfigItem } from "../types";

import { GLOB_TESTS } from "../globs";

/**
 * Scoped to {@link GLOB_TESTS}, which is the point.
 *
 * It used to say `files: ["tests/**"]` — a directory this repository does not have, and one most
 * projects do not either, since the convention here is `__tests__/`. The block therefore matched
 * nothing and none of its rules had ever run.
 */
export async function vitest(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@vitest/eslint-plugin");

  return [
    {
      files: GLOB_TESTS,
      name: "s0/vitest/rules",
      plugins: {
        vitest: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
  ];
}
