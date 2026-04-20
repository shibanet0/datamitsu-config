import type { TypedFlatConfigItem } from "../types";

export async function playwright(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-playwright");

  return [
    plugin.default.configs["flat/recommended"],
    // {
    //   name: "shibanet0/playwright/rules",
    //   plugins: {
    //     playwright: plugin.default,
    //   },
    //   rules: {
    //     ...plugin.default.configs["flat/recommended"].rules,
    //   },
    // },
  ];
}
