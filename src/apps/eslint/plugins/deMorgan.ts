import type { TypedFlatConfigItem } from "../types";

export async function deMorgan(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-de-morgan");

  return [
    {
      name: "shibanet0/de-morgan/rules",
      plugins: {
        "de-morgan": plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
  ];
}
