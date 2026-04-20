import type { TypedFlatConfigItem } from "../types";

export async function fsecond(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-fsecond");

  return [
    plugin.default.configs.recommended,
    {
      rules: {
        "fsecond/no-inline-interfaces": "off",
        "fsecond/prefer-destructured-optionals": "off",
      },
    },
  ];
}
