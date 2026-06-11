import type { Config } from "prettier";

import { indentSettings } from "../../datamitsu-config/constants";

export type { Config } from "prettier";

const baseConfig: Config = {
  arrowParens: "always",
  endOfLine: "lf",
  printWidth: indentSettings.lineWidth,
  tabWidth: indentSettings.indentWidth,
  trailingComma: "all",
  useTabs: false,
};

export const defineConfig = (config?: ((base: Config) => Config) | Config): Config =>
  typeof config === "function" ? config(baseConfig) : { ...baseConfig, ...config };
