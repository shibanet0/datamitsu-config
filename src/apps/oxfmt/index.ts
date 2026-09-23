import { defineConfig as defineOxfmtConfig, type OxfmtConfig } from "oxfmt";

import { indentSettings, jsonAlwaysExpandedOverride } from "../../datamitsu-config/constants";

export type { OxfmtConfig } from "oxfmt";

const baseConfig: OxfmtConfig = {
  arrowParens: "always",
  endOfLine: "lf",
  jsdoc: {
    commentLineStrategy: "multiline",
  },
  overrides: [jsonAlwaysExpandedOverride],
  printWidth: indentSettings.lineWidth,
  sortImports: false,
  sortPackageJson: false,
  sortTailwindcss: true,
  /**
   * On for everyone, because the cost is carried by the tool rather than the project.
   *
   * `prettier-plugin-svelte` needs `svelte/compiler`, which oxfmt deliberately does not bundle — so
   * the managed oxfmt app ships `svelte` in its own `dependencies` (see `apps.ts`) and resolution
   * never reaches the project being formatted. What is left is the question of whether to turn the
   * option on, and the honest answer is that it costs a project without svelte nothing: the plugin
   * loads only when a `.svelte` file is actually formatted — measured at 0.03s either way on a
   * TypeScript-only run.
   *
   * It was gated on the project's manifest first. That answered from the git root (one config for
   * the repository), so a monorepo whose svelte lived in a workspace had to turn it on by hand — a
   * question every consumer had to answer, to save a load that never happens.
   */
  svelte: true,
  tabWidth: indentSettings.indentWidth,
  trailingComma: "all",
};

/**
 * Accepts an overrides object, shallow-merged over the base, or a function that receives the base
 * and returns the final config — the latter is how a project extends `overrides` instead of
 * replacing it:
 *
 *     export default defineConfig((base) => ({
 *       ...base,
 *       overrides: [...(base.overrides ?? []), { files: ["*.md"], options: { printWidth: 80 } }],
 *     }));
 */
export const defineConfig = (
  config?: ((base: OxfmtConfig) => OxfmtConfig) | OxfmtConfig,
): OxfmtConfig => {
  if (typeof config === "function") {
    return defineOxfmtConfig(config(baseConfig));
  }

  return defineOxfmtConfig(mergeConfig(baseConfig, config));
};

/**
 * Adds the caller's config to the base rather than replacing the keys it names, matching
 * `src/apps/oxlint/index.ts` and `src/apps/stylelint/index.ts`.
 *
 * `overrides` is the key that makes a spread wrong here: naming one — say, to widen `printWidth`
 * for markdown — dropped `jsonAlwaysExpandedOverride`, so every JSON file in the project was
 * reformatted onto one line per value. The consequence is milder than stylelint's, where the same
 * mistake stops three languages parsing, but it is the same mistake.
 *
 * Replacing wholesale stays available through the function form, where `base` is in hand and
 * dropping it is visibly deliberate.
 */
function mergeConfig(base: OxfmtConfig, config?: OxfmtConfig): OxfmtConfig {
  if (!config) {
    return base;
  }

  const merged: OxfmtConfig = { ...base, ...config };

  // `jsdoc` is `boolean | JsdocConfig`: merge only when both sides are the object form, so that a
  // caller passing `jsdoc: false` still turns it off rather than merging into a boolean.
  if (typeof base.jsdoc === "object" && typeof config.jsdoc === "object") {
    merged.jsdoc = { ...base.jsdoc, ...config.jsdoc };
  }

  for (const key of ["overrides", "ignorePatterns"] as const) {
    if (base[key] && config[key]) {
      merged[key] = [...base[key], ...config[key]] as never;
    }
  }

  return merged;
}
