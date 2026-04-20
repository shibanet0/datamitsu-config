import type { TypedFlatConfigItem } from "../types";

export async function promise(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-promise");

  return [
    {
      name: "shibanet0/promise/rules",
      plugins: {
        promise: plugin.default,
      },
      rules: {
        ...plugin.default.configs["flat/recommended"].rules,
      },
    },
    {
      rules: {
        "promise/always-return": "off",
        "promise/catch-or-return": "off",
        "promise/no-nesting": "off",
      },
    },
  ];
}
