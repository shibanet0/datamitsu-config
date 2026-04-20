import type { TypedFlatConfigItem } from "../types";

export async function jsdoc(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-jsdoc");

  return [plugin.default.configs["flat/recommended"]];
}
