import type { TypedFlatConfigItem } from "../types";

export async function compat(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-compat");

  return [plugin.default.configs["flat/recommended"]];
}
