import type { TypedFlatConfigItem } from "../types";

export async function regexp(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-regexp");

  return [plugin.default.configs.recommended];
}
