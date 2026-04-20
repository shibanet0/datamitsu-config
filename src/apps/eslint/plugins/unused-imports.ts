import type { TypedFlatConfigItem } from "../types";

export async function unusedImports(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-unused-imports");

  return [
    {
      name: "shibanet0/unused-imports/rules",
      plugins: {
        "unused-imports": plugin.default,
      },
      rules: {
        "no-unused-vars": "off", // or "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
          "warn",
          {
            args: "after-used",
            argsIgnorePattern: "^_",
            vars: "all",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
  ];
}
