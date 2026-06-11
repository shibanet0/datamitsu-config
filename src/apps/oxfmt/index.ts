import { defineConfig as defineOxfmtConfig, type OxfmtConfig } from "oxfmt";

import { indentSettings } from "../../datamitsu-config/constants";

export type { OxfmtConfig } from "oxfmt";

export const defineConfig = (config?: OxfmtConfig): OxfmtConfig =>
  defineOxfmtConfig({
    arrowParens: "always",
    endOfLine: "lf",
    jsdoc: {
      commentLineStrategy: "multiline",
    },
    printWidth: indentSettings.lineWidth,
    sortImports: false,
    sortPackageJson: false,
    sortTailwindcss: true,
    tabWidth: indentSettings.indentWidth,
    trailingComma: "all",
    ...config,
  });
