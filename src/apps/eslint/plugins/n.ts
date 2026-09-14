import type { TypedFlatConfigItem } from "../types";

/**
 * Eslint-plugin-n, split along the line the upstream presets confuse: which files are modules, and
 * which rules run.
 *
 * `configs["flat/recommended"]` picks between `recommended-module` and `recommended-script` by
 * reading the nearest `package.json` at plugin-import time, and returns a single **unscoped** block
 * carrying both the 14 rules and a `languageOptions.sourceType`. That last part is the bug: an
 * unscoped `sourceType` applies to every file in the project, decided by one field in one
 * manifest.
 *
 * In a project without `"type": "module"` it resolves to `commonjs`, and every `.js`, `.jsx` and
 * `.mjs` file fails with `Parsing error: 'import' and 'export' may appear only with 'sourceType:
 * module'` — including the `eslint.config.mjs` this package generates. `.ts` and `.tsx` are
 * unaffected, which is what makes it read as random. And datamitsu deliberately omits `type` for
 * next, expo, gatsby, electron, react-native and docusaurus, so the config manufactures the failing
 * shape itself. The mirror case is live here: with `"type": "module"` the unscoped `sourceType` is
 * `module`, which is wrong for any `.cjs` file in the repository.
 *
 * `flat/mixed-esm-and-cjs` already answers the question per extension — `.js`/`.mjs` module, `.cjs`
 * commonjs — so its blocks provide the language settings. It also scopes its _rules_ to those three
 * extensions, which would quietly stop all 14 from running on `.ts`, so the rules are re-emitted
 * once, unscoped, exactly as before. Nothing changes about which rules run anywhere; only which
 * files are parsed as what.
 */
export async function n(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-n");

  const scoped = plugin.default.configs["flat/mixed-esm-and-cjs"] as TypedFlatConfigItem[];

  return [
    // Language settings only. The `rules` are dropped here and restored below, unscoped.
    ...scoped.map(({ rules: _rules, ...block }) => block),
    {
      name: "s0/n/rules",
      plugins: { n: plugin.default },
      rules: {
        ...(plugin.default.configs["flat/recommended-module"] as TypedFlatConfigItem).rules,
      },
    },
  ];
}
