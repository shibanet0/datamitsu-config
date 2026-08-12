import type { TypedFlatConfigItem } from "../types";

export async function pluginImport(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-import-x");

  return [
    {
      name: "shibanet0/import/rules",
      plugins: {
        "import-x": plugin.default,
      },
      rules: {
        ...plugin.flatConfigs.recommended.rules,
      },
    },
    {
      rules: {
        "import-x/default": "off",
        "import-x/extensions": "off",
        "import-x/named": "off",
        "import-x/namespace": "off",
        "import-x/no-extraneous-dependencies": "off",
        "import-x/no-relative-packages": "off",
        "import-x/no-unresolved": "off",
        "import-x/order": "off",
        "import-x/prefer-default-export": "off",
      },
    },
  ];
}
