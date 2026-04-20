import type { TypedFlatConfigItem } from "../types";

export async function jsonc(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-jsonc");

  return [
    ...plugin.configs["flat/recommended-with-jsonc"],
    ...plugin.configs["flat/recommended-with-json5"],
  ];
}
