import type { TypedFlatConfigItem } from "../types";

export async function reactYouMightNotNeedAnEffect(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-react-you-might-not-need-an-effect");

  return [plugin.default.configs.recommended];
}
