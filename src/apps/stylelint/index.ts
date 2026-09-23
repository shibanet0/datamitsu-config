import type { Config } from "stylelint";

import { fileURLToPath } from "node:url";

import { mergeConfig } from "./merge";

export type { Config } from "stylelint";

/**
 * Resolves a preset to an absolute path inside the managed app's own `node_modules`.
 *
 * A bare name in `extends` is resolved against the **config file**, and the config file is the
 * consuming project's `stylelint.config.mjs` — so `extends: ["stylelint-config-standard"]` sends
 * stylelint looking in the project's `node_modules`, where the preset is not installed and is not
 * meant to be: `ConfigurationError: Could not find "stylelint-config-standard"`, measured.
 *
 * This module is bundled into the app's install directory, next to those packages, so resolving
 * from here finds them. It is the mirror image of the `svelte/compiler` problem — the tool's
 * dependencies live with the tool, and whatever names them has to resolve from there.
 *
 * `import.meta.resolve` rather than `createRequire(...).resolve`: `stylelint-config-standard-scss`
 * publishes `exports: { ".": { "import": "./index.js" } }` — an ESM condition and nothing else — so
 * CJS resolution fails on it with `ERR_PACKAGE_PATH_NOT_EXPORTED` while the other presets resolve
 * fine. Same reason the result has to go through `fileURLToPath`: stylelint wants a path, not a
 * `file:` URL.
 */
const preset = (name: string): string => fileURLToPath(import.meta.resolve(name));

/**
 * CSS gets a linter, not a second formatter.
 *
 * The rules a formatter would fight over left stylelint in 16 — indentation, string quotes, brace
 * and whitespace placement are gone, not deprecated — which is why there is no `-config-prettier`
 * equivalent between this and oxfmt. Not _everything_ stylistic went with them: of standard's 41
 * rules, 9 are still conventions about blank lines and quoting (`rule-empty-line-before`,
 * `font-family-name-quotes`, `comment-whitespace-inside`). Those coexist rather than conflict —
 * measured: stylelint's `--fix` inserts the blank line before a comment, oxfmt leaves it, and the
 * re-check is clean.
 *
 * What standard adds over recommended is convention (naming patterns, shorthand, modern color and
 * media syntax); what recommended carries alone is the set of things that are simply wrong (unknown
 * properties, duplicate selectors, invalid at-rules).
 *
 * Every preset goes through {@link preset}, which turns the package name into an absolute path in
 * the managed app's install — see the note there for why a bare name cannot work.
 */
const baseConfig: Config = {
  extends: [preset("stylelint-config-standard")],
  overrides: [
    {
      extends: [preset("stylelint-config-standard-scss")],
      files: ["**/*.scss"],
    },
    /**
     * The three `<style>`-carrying shapes. Each preset's job is to attach `postcss-html` as the
     * custom syntax; the rules keep coming from `stylelint-config-standard` above.
     *
     * The SCSS preset is extended here too, not only for `.scss` files. `postcss-html` picks the
     * parser from `lang="scss"` on the block, but a stylelint `overrides` entry matches on the file
     * name — so a component's `<style lang="scss">` was being checked against the plain-CSS rules,
     * and `@include theme;` failed `at-rule-no-unknown`. Verified on both `.vue` and `.svelte`.
     * Neither SCSS preset sets `customSyntax`, so extending it cannot displace `postcss-html`, and
     * its rules match nothing in a plain-CSS block — the cost of carrying it is zero.
     *
     * `no-empty-source` is off for all of them, and it is not a style preference: postcss-html
     * hands stylelint an empty document for every component that has no `<style>` block at all, so
     * left on, the rule reports each one — a finding about the extraction, not about the file. The
     * vue preset already does this for `.vue`; html and svelte have no preset that does.
     */
    {
      extends: [preset("stylelint-config-html/html")],
      files: ["**/*.html", "**/*.htm", "**/*.xhtml"],
      rules: { "no-empty-source": null },
    },
    {
      extends: [
        preset("stylelint-config-standard-scss"),
        preset("stylelint-config-recommended-vue/scss"),
      ],
      files: ["**/*.vue"],
    },
    {
      extends: [preset("stylelint-config-standard-scss"), preset("stylelint-config-html/svelte")],
      files: ["**/*.svelte"],
      rules: {
        "no-empty-source": null,
        /**
         * `:global(...)` is how a Svelte component styles anything outside itself — the language's
         * own selector, rejected by `selector-pseudo-class-no-unknown` because
         * `stylelint-config-html/svelte` supplies the parser and no rules. The vue preset carries
         * the same exception for `:deep`, `:global` and `:slotted`; svelte has no preset that
         * does.
         */
        "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
      },
    },
  ],
  /**
   * All four disable reports, which is stylelint's counterpart to ESLint's
   * `reportUnusedDisableDirectives` — and unlike that one, there is no reason to wait.
   *
   * ESLint's is off here for the duration of the batch park: "unused" means "names a rule this
   * config has off", so every rule moved into `temporary.ts` turns an existing `eslint-disable` for
   * it into an error, and the check is most destructive while the rule set is still settling.
   * stylelint arrives with no backlog and no disables written against it anywhere — nothing existed
   * to grandfather in — so the strict reading costs nothing now and would cost a migration later.
   *
   * What each one catches, in the order they bite:
   *
   * - `reportUnscopedDisables` — a blanket `/* stylelint-disable *\/` that names no rule and so
   *   silences every future rule as well, including ones added by a preset bump.
   * - `reportDescriptionlessDisables` — a disable with no `-- reason` after it. The reason is the
   *   whole point of a written-down exception; this is the same standard `src/lint-rules` holds.
   * - `reportNeedlessDisables` — a disable for a rule that reports nothing there any more, which is
   *   how a suppression outlives the problem it was hiding.
   * - `reportInvalidScopeDisables` — a disable naming a rule this config does not enable at all: a
   *   typo, or a rule a preset dropped. It reads as protection and is doing nothing.
   */
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  reportUnscopedDisables: true,
};

/**
 * Accepts an overrides object — added to the base rather than replacing the keys it names, see
 * {@link mergeConfig} — or a function that receives the base and returns the final config, which is
 * how a project replaces wholesale:
 *
 *     export default defineConfig((base) => ({
 *       ...base,
 *       rules: { ...base.rules, "selector-class-pattern": null },
 *     }));
 */
export const defineConfig = (config?: ((base: Config) => Config) | Config): Config =>
  typeof config === "function" ? config(baseConfig) : mergeConfig(baseConfig, config);
