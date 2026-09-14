import type { TypedFlatConfigItem } from "../types";

export async function noUnsanitized(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-no-unsanitized");

  // `.default`: the package is CJS, so the namespace object holds the plugin under `default`.
  // Reaching for `plugin.configs` gave `undefined` and threw the moment the plugin was enabled —
  // which is why it was switched off by default rather than fixed.
  return [plugin.default.configs.recommended];
}
