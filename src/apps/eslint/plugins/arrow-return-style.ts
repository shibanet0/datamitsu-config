import type { TypedFlatConfigItem } from "../types";

export async function arrowReturnStyle(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-arrow-return-style");

  return [plugin.default.configs.recommended];
}
