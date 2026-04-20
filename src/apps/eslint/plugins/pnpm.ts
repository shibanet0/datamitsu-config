import type { TypedFlatConfigItem } from "../types";

export async function pnpm(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-pnpm");

  return [
    ...plugin.configs.recommended,
    {
      rules: {
        "pnpm/json-enforce-catalog": "off",
      },
    },
  ];
}
