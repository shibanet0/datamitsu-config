import type { TypedFlatConfigItem } from "../types";

export async function pluginImport(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-import-x");

  return [
    {
      name: "s0/import/rules",
      plugins: {
        "import-x": plugin.default,
      },
      rules: {
        ...plugin.flatConfigs.recommended.rules,
      },
    },
    {
      rules: {},
    },
  ];
}
