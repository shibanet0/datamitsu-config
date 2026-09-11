import type { TypedFlatConfigItem } from "../types";

export async function sonarjs(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-sonarjs");

  return [
    {
      name: "s0/sonarjs/rules",
      plugins: {
        sonarjs: plugin.default,
      },
      rules: {
        ...plugin.configs.recommended.rules,
      },
    },
    {
      rules: {},
    },
  ];
}
