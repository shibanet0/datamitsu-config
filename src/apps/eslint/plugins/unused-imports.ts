import type { TypedFlatConfigItem } from "../types";

export async function unusedImports(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-unused-imports");

  return [
    {
      name: "s0/unused-imports/rules",
      plugins: {
        "unused-imports": plugin.default,
      },
      rules: {
        // `no-unused-vars` and its `@typescript-eslint` twin are turned off in `src/lint-rules`,
        // where the reason is written down. Repeating it here made deleting the list entry a no-op.
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
