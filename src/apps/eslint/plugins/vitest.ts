import type { TypedFlatConfigItem } from "../types";

export async function vitest(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@vitest/eslint-plugin");

  return [
    {
      files: ["tests/**"],
      plugins: {
        vitest: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules, // you can also use vitest.configs.all.rules to enable all rules
        // 'vitest/max-nested-describe': ['error', { max: 3 }], // you can also modify rules' behavior using option like this
      },
    },
  ];
}
