import type { TypedFlatConfigItem } from "../types";

export async function pluginImport(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-import");

  return [
    {
      name: "shibanet0/import/rules",
      plugins: {
        import: plugin.default,
      },
      rules: {
        ...plugin.flatConfigs.recommended.rules,
      },
    },
    {
      rules: {
        "import/default": "off",
        "import/extensions": "off",
        "import/named": "off",
        "import/namespace": "off",
        "import/no-extraneous-dependencies": "off",
        "import/no-relative-packages": "off",
        "import/no-unresolved": "off",
        "import/order": "off",
        "import/prefer-default-export": "off",
      },
    },
  ];
}
