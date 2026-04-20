import type { TypedFlatConfigItem } from "../types";

export async function stylistic(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@stylistic/eslint-plugin");

  return [
    {
      plugins: {
        "@stylistic": plugin.default,
      },
      rules: {
        // "@stylistic/indent": ["error", 2],
        // indent: ["error", 2],
      },
    },
  ];
}
