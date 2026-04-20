import type { TypedFlatConfigItem } from "../types";

export const javascript = async (): Promise<TypedFlatConfigItem[]> => {
  const [plugin, globals] = await Promise.all([import("@eslint/js"), import("globals")]);

  return [
    { ...plugin.default.configs.recommended, name: "shibanet0/js" },
    {
      languageOptions: {
        ecmaVersion: "latest",
        globals: {
          ...globals.browser,
          ...globals.es2026,
          ...globals.node,
          document: "readonly",
          navigator: "readonly",
          window: "readonly",
        },
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          ecmaVersion: "latest",
          sourceType: "module",
        },
        sourceType: "module",
      },
      linterOptions: {
        reportUnusedDisableDirectives: false,
      },
      name: "shibanet0/js/setup",
    },
    { rules: { "no-empty": "off", "no-restricted-imports": "off", "no-undef": "off" } },
  ];
};
