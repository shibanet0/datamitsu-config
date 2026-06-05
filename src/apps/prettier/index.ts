import type { Config } from "prettier";

import { indentSettings } from "../../datamitsu-config/constants";

export type { Config } from "prettier";

export const defineConfig = (config?: Config): Config => {
  return {
    arrowParens: "always",
    endOfLine: "lf",
    printWidth: indentSettings.lineWidth,
    tabWidth: indentSettings.indentWidth,
    trailingComma: "all",
    useTabs: false,
    ...config,
  };
};
