import plugin from "eslint-plugin-oxlint";

import type { OxlintDefineConfigOptions, OxlintPackageJson, Oxlintrc } from "../../oxlint";
import type { TypedFlatConfigItem } from "../types";

import { toOxlintRuleName } from "../../../lint-rules";
import { oxlintConfigFor } from "../../oxlint";
import { GLOB_SRC, GLOB_SVELTE } from "../globs";

/**
 * Eslint-plugin-oxlint emits its "already covered by oxlint" turn-offs under the rule names of the
 * original ESLint plugins. Two of those plugins were swapped for forks that keep the rule names but
 * change the prefix, so the emitted names have to be rewritten or the duplicate suppression
 * silently stops matching and diagnostics get reported twice.
 *
 * `react/*` gets no blanket entry: @eslint-react renamed the rules themselves, not just the prefix.
 */
const PREFIX_REMAP: Record<string, string> = {
  "import/": "import-x/",
  "jsx-a11y/": "jsx-a11y-x/",
};

/**
 * Built from the shared config object, never from a file on disk.
 *
 * There used to be a `configFilePath` option, and every generated `eslint.config.mjs` passed it,
 * pointing at the project's own `.oxlintrc.json`. That file only ever said `extends`, and
 * `buildFromOxlintConfigFile` does not follow `extends` — so it read an empty rule set and
 * suppressed 76 ESLint rules where the config object suppresses 304. The other 228 were rules both
 * tools reported, on the same line, under two names.
 *
 * The option is also unimplementable now: the oxlint config is a TypeScript module, and
 * `buildFromOxlintConfigFile` reads JSON.
 *
 * Built for the _project_, not from the package's own defaults. A suppression here is a claim that
 * oxlint reports the rule instead — so it has to be made against the plugin set the project's
 * oxlint run actually enables. Without the manifest, a package with no Next.js would have its
 * `@next/next/*` rules turned off in ESLint on the strength of a `nextjs` plugin that no longer
 * runs there, and nothing would report them.
 */
export async function oxlint(
  packageJSON?: OxlintPackageJson,
  options?: OxlintDefineConfigOptions,
  projectConfig?: unknown,
): Promise<TypedFlatConfigItem[]> {
  // The project's own config when it passed one, this package's otherwise. See
  // `DefineConfigOptions.oxlintConfig`: a suppression here claims oxlint reports the rule, and a
  // project that turned that rule off in its own `oxlint.config.mts` has made the claim false.
  const config = (projectConfig as Oxlintrc | undefined) ?? oxlintConfigFor(packageJSON, options);
  const silentInOxlint = new Set(
    Object.entries(config.rules ?? {})
      .filter(([, severity]) => severity === "off" || severity === "allow")
      .map(([name]) => name),
  );

  return scopeToWhatOxlintReads(
    remapPrefixes(
      dropSuppressionsOxlintDoesNotEarn(
        [
          ...plugin.buildFromOxlintConfig(
            config as Parameters<typeof plugin.buildFromOxlintConfig>[0],
          ),
        ],
        silentInOxlint,
      ),
    ),
  );
}

/**
 * The file types oxlint is actually given. `oxlintGlobs` in the planner lists these plus `.vue` and
 * `.astro`, which ESLint has no parser for here — a suppression there would be a turn-off with
 * nothing on either side of it.
 */
const OXLINT_READS = [GLOB_SRC, GLOB_SVELTE];

/**
 * Removes emitted suppressions for rules oxlint is not actually reporting.
 *
 * Every rule this plugin turns off is a claim that oxlint reports it instead. The plugin has a
 * branch for withdrawing that claim when the oxlint config says the rule is off — and it guards on
 * `rule in rules`, testing an oxlint-spelled name against a map keyed by ESLint names. Every
 * renamed prefix therefore misses, and the suppression survives for a rule oxlint has been told to
 * stay quiet about.
 *
 * With the shared list applied to both tools the outcome is usually the same either way, since
 * `s0/disabled-rules` turns the rule off in ESLint too. It stops being the same the moment a
 * project passes `temporaryRules: false`: the backlog comes back on in ESLint, and 57 rules — the
 * whole type-aware set among them — stay silenced by a suppression whose premise no longer holds.
 * The bar the opt-out exists to raise is the bar it quietly lowers.
 *
 * The emitted names are already close to oxlint's spelling — the plugin writes them under the
 * original plugin's prefix, which is the one oxlint kept — so a single pass through
 * `toOxlintRuleName` covers the two that differ (`@typescript-eslint/`, `n/`).
 */
function dropSuppressionsOxlintDoesNotEarn(
  configs: TypedFlatConfigItem[],
  silentInOxlint: Set<string>,
): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (!config.rules) {
      return config;
    }

    const rules: NonNullable<TypedFlatConfigItem["rules"]> = {};

    for (const [name, entry] of Object.entries(config.rules)) {
      if (!silentInOxlint.has(toOxlintRuleName(name))) {
        rules[name] = entry;
      }
    }

    return { ...config, rules };
  });
}

/**
 * The narrower of two glob lists, expressed the way flat config expresses "both": an array entry
 * that is itself an array is an AND of its patterns, so a file has to match one of ours and one of
 * theirs.
 */
function intersect(
  emitted: TypedFlatConfigItem["files"],
  ours: string[],
): NonNullable<TypedFlatConfigItem["files"]> {
  if (emitted === undefined) {
    return ours;
  }

  return emitted.flatMap((entry) => ours.map((glob) => [glob, ...[entry].flat()]));
}

function remapPrefixes(configs: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (!config.rules) {
      return config;
    }

    const rules: NonNullable<TypedFlatConfigItem["rules"]> = {};

    for (const [name, entry] of Object.entries(config.rules)) {
      const prefix = Object.keys(PREFIX_REMAP).find((p) => name.startsWith(p));
      rules[prefix ? PREFIX_REMAP[prefix] + name.slice(prefix.length) : name] = entry;
    }

    return { ...config, rules };
  });
}

/**
 * Confines the suppressions to the files oxlint lints.
 *
 * Every emitted block is a claim that oxlint reports the rule instead, and the blocks arrive with
 * no `files`, so the claim was being made for every file ESLint reads — including `.html`, `.json`,
 * `.jsonc` and `.json5`, which the planner never hands to oxlint at all.
 *
 * Measured on a `<script>` holding `if (1 == "1")`: ESLint reported nothing, and with the handoff
 * removed it reported `eqeqeq` and `no-constant-condition`. Neither tool was looking — ESLint
 * because it had been told oxlint would, oxlint because `.html` is not in its globs. Embedded
 * script is the whole reason ESLint reads HTML here, so the gap covered exactly the rules that
 * exist for it.
 */
function scopeToWhatOxlintReads(configs: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (!config.rules) {
      return config;
    }

    // A block that already carries `files` is scoped too — by intersection, not by leaving it
    // alone. `buildFromOxlintConfig` emits one per `overrides` entry in the project's own oxlint
    // config, and a project whose override says `files: ["**/*"]` put the suppressions back on
    // `.html` and the HTML gap with them.
    return { ...config, files: intersect(config.files, OXLINT_READS) };
  });
}
