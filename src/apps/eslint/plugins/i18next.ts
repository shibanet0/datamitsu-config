import type { TypedFlatConfigItem } from "../types";

export async function i18next(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-i18next");

  return [plugin.default.configs["flat/recommended"]];
}
