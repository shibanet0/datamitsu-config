import type { TypedFlatConfigItem } from "../types";

export async function vanillaExtract(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@antebudimir/eslint-plugin-vanilla-extract");

  return [
    // Scoped to `.css.ts`. The plugin's own recommended config carries no `files`, so it was
    // ordering every object literal in the repository by CSS-property order — including ones that
    // have nothing to do with styling, where it collides head-on with perfectionist/sort-objects.
    {
      files: ["**/*.css.ts"],
      name: "shibanet0/vanilla-extract/rules",
      plugins: {
        "vanilla-extract": plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
        "vanilla-extract/no-empty-style-blocks": "-",
      },
    },
  ];
}
