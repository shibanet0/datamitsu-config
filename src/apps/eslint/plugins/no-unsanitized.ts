import type { TypedFlatConfigItem } from "../types";

export async function noUnsanitized(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-no-unsanitized");

  return [plugin.configs.recommended];
}
