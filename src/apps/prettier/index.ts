import type { Config } from "prettier";
export type { Config } from "prettier";

export const defineConfig = (config?: Config): Config => {
  return {
    arrowParens: "always",
    endOfLine: "lf",
    printWidth: 100,
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
    ...config,
  };
};
