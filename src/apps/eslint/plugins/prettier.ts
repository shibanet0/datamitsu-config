import type { TypedFlatConfigItem } from "../types";

export async function prettier(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-config-prettier/flat");

  return [
    {
      name: "shibanet0/prettier/rules",
      plugins: {
        prettier: plugin.default,
      },
      rules: {
        ...plugin.default.rules,
      },
    },
  ];
}
