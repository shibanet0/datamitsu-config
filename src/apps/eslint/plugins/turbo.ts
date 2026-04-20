import type { TypedFlatConfigItem } from "../types";

export async function turbo(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-turbo");

  return [
    plugin.configs!["flat/recommended"] as unknown as TypedFlatConfigItem,
    // {
    //   name: "shibanet0/turbo/rules",
    //   plugins: {
    //     turbo: plugin.default,
    //   },
    //   rules: {
    //     ...plugin.default.configs["flat/recommended"].rules,
    //   },
    // },
  ];
}
