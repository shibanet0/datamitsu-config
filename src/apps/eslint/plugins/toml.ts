import type { TypedFlatConfigItem } from "../types";

export async function toml(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-toml");

  return [
    ...plugin.default.configs["flat/recommended"],
    // {
    //   name: "shibanet0/toml/rules",
    //   plugins: {
    //     toml: plugin.default,
    //   },
    //   rules: {
    //     // ...plugin.default.configs["flat/recommended"].rules,
    //   },
    // },
  ];
}
