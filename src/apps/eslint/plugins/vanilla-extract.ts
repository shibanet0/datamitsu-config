import type { TypedFlatConfigItem } from "../types";

export async function vanillaExtract(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@antebudimir/eslint-plugin-vanilla-extract");

  return [
    plugin.default.configs.recommended,
    // {
    //   files: ["**/*.css.ts"],
    //   ignores: ["src/**/theme-contract.css.ts"],
    //   name: "shibanet0/vanilla-extract/rules",
    //   plugins: {
    //     "vanilla-extract": plugin.default,
    //   },
    //   rules: {
    //     ...plugin.default.configs.recommended.rules,
    //   },
    // },
  ];
}
