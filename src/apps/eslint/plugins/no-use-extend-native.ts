import type { TypedFlatConfigItem } from "../types";

export async function noUseExtendNative(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-no-use-extend-native");

  return [
    plugin.configs.recommended,
    // {
    //   name: "shibanet0/no-use-extend-native/rules",
    //   plugins: {
    //     "no-use-extend-native": plugin.default,
    //   },
    //   rules: {
    //     ...plugin.default.configs.recommended.rules,
    //   },
    // },
  ];
}
