import type { TypedFlatConfigItem } from "../types";

export async function escompat(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-escompat");

  return [plugin.default.configs["flat/recommended"]];
}
