import type { TypedFlatConfigItem } from "../types";

export async function depend(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-depend");

  return [plugin.configs["flat/recommended"]];
}
