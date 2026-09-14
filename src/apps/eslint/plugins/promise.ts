import type { TypedFlatConfigItem } from "../types";

export async function promise(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-promise");

  return [
    {
      name: "s0/promise/rules",
      plugins: {
        promise: plugin.default,
      },
      rules: {
        ...plugin.default.configs["flat/recommended"].rules,
      },
    },
  ];
}
