import type { TypedFlatConfigItem } from "../types";

export async function security(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-security");

  return [
    {
      name: "shibanet0/security/rules",
      plugins: {
        security: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },

    {
      rules: {
        "security/detect-non-literal-fs-filename": "off",
        "security/detect-object-injection": "off",
      },
    },
  ];
}
