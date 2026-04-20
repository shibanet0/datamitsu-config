import type { TypedFlatConfigItem } from "../types";

export async function command(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-command/config");

  return [plugin.default()];
}
