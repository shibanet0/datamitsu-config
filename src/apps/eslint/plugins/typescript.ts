import { defineConfig } from "eslint/config";

import type { Rules, TypedFlatConfigItem } from "../types";

import { GLOB_TS, GLOB_TSX } from "../globs";

export const typescript = async (): Promise<TypedFlatConfigItem[]> => {
  const plugin = await import("typescript-eslint");

  return defineConfig({
    extends: [...plugin.default.configs.recommended],
    files: [GLOB_TS, GLOB_TSX],
    name: "shibanet0/typescript",
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          disallowTypeAnnotations: true,
          fixStyle: "separate-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      // temporary: disabled until plugin ecosystem types improve
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    } satisfies Rules,
  });
};
