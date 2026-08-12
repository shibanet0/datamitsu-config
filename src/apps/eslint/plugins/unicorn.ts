import type { TypedFlatConfigItem } from "../types";

import { GLOB_SRC } from "../globs";

// export const unicornRules: ConfigWithExtends[] = [
//   eslintPluginUnicorn.configs.recommended,
//   {
//     rules: {
//       "unicorn/empty-brace-spaces": "off",
//       "unicorn/filename-case": "off",
//       "unicorn/prefer-global-this": "off",
//       "unicorn/prefer-query-selector": "off",
//     },
//   },
// ];

export async function unicorn(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-unicorn");

  return [
    {
      // ESLint 10 refuses to apply a rule that declares a language to files owned
      // by a different language plugin, and eslint-plugin-jsonc v3 now registers
      // its own `jsonc/x` language for JSON files. Scope unicorn to JS/TS so the
      // two never overlap.
      files: [GLOB_SRC],
      name: "shibanet0/unicorn/rules",
      plugins: {
        unicorn: plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },

    {
      files: [GLOB_SRC],
      rules: {
        "unicorn/catch-error-name": "off",
        "unicorn/consistent-function-scoping": "off",
        "unicorn/empty-brace-spaces": "off",
        "unicorn/filename-case": "off",
        "unicorn/import-style": "off",
        "unicorn/no-abusive-eslint-disable": "off",
        "unicorn/no-array-for-each": "off",
        "unicorn/no-array-reduce": "off",
        "unicorn/no-array-reverse": "off",
        "unicorn/no-array-sort": "off",
        "unicorn/no-empty-file": "off",
        "unicorn/no-immediate-mutation": "off",
        "unicorn/no-keyword-prefix": ["error", { disallowedPrefixes: ["new"] }],
        "unicorn/no-lonely-if": "off",
        "unicorn/no-negated-condition": "off",
        "unicorn/no-nested-ternary": "off",
        "unicorn/no-null": "off",
        "unicorn/no-process-exit": "off",
        "unicorn/no-single-promise-in-promise-methods": "off",
        "unicorn/no-unreadable-iife": "off",
        "unicorn/no-useless-collection-argument": "off",
        "unicorn/no-useless-error-capture-stack-trace": "off",
        "unicorn/prefer-add-event-listener": "off",
        "unicorn/prefer-array-some": "off",
        "unicorn/prefer-classlist-toggle": "off",
        "unicorn/prefer-dom-node-append": "off",
        "unicorn/prefer-dom-node-remove": "off",
        "unicorn/prefer-dom-node-text-content": "off",
        "unicorn/prefer-global-this": "off",
        "unicorn/prefer-module": "off",
        "unicorn/prefer-number-properties": "off",
        "unicorn/prefer-optional-catch-binding": "off",
        "unicorn/prefer-query-selector": "off",
        "unicorn/prefer-set-has": "off",
        "unicorn/prefer-single-call": "off",
        "unicorn/prefer-spread": "off",
        "unicorn/prefer-string-raw": "off",
        "unicorn/prefer-type-error": "off",
        "unicorn/prevent-abbreviations": "off",
        "unicorn/require-module-specifiers": "off",
      },
    },
  ];
}
