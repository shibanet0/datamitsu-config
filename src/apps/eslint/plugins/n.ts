import type { TypedFlatConfigItem } from "../types";

export async function n(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-n");

  return [
    plugin.default.configs["flat/recommended"],
    // {
    //   name: "shibanet0/n/rules",
    //   plugins: {
    //     n: plugin.default,
    //   },
    //   rules: {
    //     ...plugin.configs["flat/recommended"].rules,
    //   },
    // },
  ];
}
