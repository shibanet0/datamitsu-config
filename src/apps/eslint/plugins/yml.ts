import type { TypedFlatConfigItem } from "../types";

export async function yml(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-yml");

  return [
    ...plugin.default.configs["flat/recommended"],
    // {
    //   name: "shibanet0/yml/rules",
    //   plugins: {
    //     yml: plugin.default,
    //   },
    //   rules: {
    //     // ...plugin.default.configs["flat/recommended"],
    //   },
    // },
    {
      rules: {
        "yml/no-multiple-empty-lines": "error",
        "yml/sort-keys": "error",
      },
    },
  ];
}
