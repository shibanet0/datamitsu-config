import { defineConfig } from "eslint/config";

import type { Rules, TypedFlatConfigItem } from "../types";

import { GLOB_TS, GLOB_TSX } from "../globs";

export const typescript = async (): Promise<TypedFlatConfigItem[]> => {
  const plugin = await import("typescript-eslint");

  return defineConfig({
    extends: [...plugin.default.configs.recommended],
    files: [GLOB_TS, GLOB_TSX],
    name: "s0/typescript",
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          disallowTypeAnnotations: true,
          fixStyle: "separate-type-imports",
          prefer: "type-imports",
        },
      ],
      // temporary: disabled until plugin ecosystem types improve
      "@typescript-eslint/no-unused-vars": "off",
      // "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    } satisfies Rules,
  });
};
