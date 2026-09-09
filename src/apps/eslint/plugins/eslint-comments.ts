import type { TypedFlatConfigItem } from "../types";

/**
 * Rules about the suppression comments themselves — the other half of
 * `reportUnusedDisableDirectives`.
 *
 * That option catches a directive that suppresses nothing. These catch the shapes that suppress too
 * much or never end: `no-unlimited-disable` (a bare `/* eslint-disable *\/` that silences every
 * rule for the rest of the file), `disable-enable-pair`, `no-aggregating-enable`,
 * `no-duplicate-disable`, `no-unused-enable`.
 *
 * The plugin was a dependency every consumer downloaded and no config ever loaded.
 */
export async function eslintComments(): Promise<TypedFlatConfigItem[]> {
  const configs = await import("@eslint-community/eslint-plugin-eslint-comments/configs");

  return [
    {
      ...configs.recommended,
      name: "s0/eslint-comments/rules",
      rules: {
        ...configs.recommended.rules,
        // A file-wide disable at the top of a generated file is the legitimate use of the shape
        // this rule guards against. Without `allowWholeFile` it demands a matching `eslint-enable`
        // at the bottom, which says nothing and has to be regenerated along with the file.
        "@eslint-community/eslint-comments/disable-enable-pair": [
          "error",
          { allowWholeFile: true },
        ],
      },
    },
  ];
}
