import type { TypedFlatConfigItem } from "../types";

export async function clsx(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-clsx");

  return [plugin.default.configs.flat.recommended as TypedFlatConfigItem];
}
