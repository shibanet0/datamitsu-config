import type { TypedFlatConfigItem } from "../types";

import { GLOB_SRC } from "../globs";

export async function unicorn(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-unicorn");

  return [
    {
      // ESLint 10 refuses to apply a rule that declares a language to files owned
      // by a different language plugin, and eslint-plugin-jsonc v3 now registers
      // its own `jsonc/x` language for JSON files. Scope unicorn to JS/TS so the
      // two never overlap.
      files: [GLOB_SRC],
      name: "s0/unicorn/rules",
      plugins: {
        unicorn: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },

    {
      files: [GLOB_SRC],
      rules: {
        "unicorn/no-keyword-prefix": ["error", { disallowedPrefixes: ["new"] }],
      },
    },
  ];
}
