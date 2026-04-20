import type { TypedFlatConfigItem } from "../types";

export async function arrayFunc(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-array-func");

  return [
    {
      name: "shibanet0/array-func/rules",
      plugins: {
        "array-func": plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
    {
      rules: {
        "array-func/from-map": "off",
        "array-func/prefer-array-from": "off",
      },
    },
  ];
}
