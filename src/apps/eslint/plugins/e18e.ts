import type { TypedFlatConfigItem } from "../types";

export async function e18e(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@e18e/eslint-plugin");

  return [
    {
      name: "shibanet0/e18e/rules",
      plugins: {
        e18e: plugin.default,
      },
      rules: {
        ...(plugin.default.configs?.recommended as any)?.rules,
      },
    },
  ];
}
