import type { Config } from "prettier";

import { indentSettings, jsonAlwaysExpandedOverride } from "../../datamitsu-config/constants";

export type { Config } from "prettier";

const baseConfig: Config = {
  arrowParens: "always",
  endOfLine: "lf",
  overrides: [jsonAlwaysExpandedOverride],
  printWidth: indentSettings.lineWidth,
  tabWidth: indentSettings.indentWidth,
  trailingComma: "all",
  useTabs: false,
};

export const defineConfig = (config?: ((base: Config) => Config) | Config): Config =>
  typeof config === "function" ? config(baseConfig) : { ...baseConfig, ...config };
