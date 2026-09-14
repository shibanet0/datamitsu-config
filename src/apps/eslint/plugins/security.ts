import type { TypedFlatConfigItem } from "../types";

export async function security(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-security");

  return [
    {
      name: "s0/security/rules",
      plugins: {
        security: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
  ];
}
