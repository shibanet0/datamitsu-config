import type { TypedFlatConfigItem } from "../types";

export async function storybook(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-storybook");

  return plugin.configs["flat/recommended"] as unknown as TypedFlatConfigItem[];
}
