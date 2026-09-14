import type { OxlintDefineConfigOptions, OxlintPackageJson, Oxlintrc } from "../../oxlint";
import type { TypedFlatConfigItem } from "../types";

import { toOxlintRuleName } from "../../../lint-rules";
import { oxlintConfigFor } from "../../oxlint";

/**
 * Eslint-plugin-oxlint emits its "already covered by oxlint" turn-offs under the rule names of the
 * original ESLint plugins. Two of those plugins were swapped for forks that keep the rule names but
 * change the prefix, so the emitted names have to be rewritten or the duplicate suppression
 * silently stops matching and diagnostics get reported twice.
 *
 * `react/*` gets no blanket entry: @eslint-react renamed the rules themselves, not just the prefix,
 * so there is no mechanical mapping. Part of oxlint's `react` scope does have an exact ESLint home
 * though — see {@link reactHooksRuleNames}.
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
  const [plugin, reactHooks] = await Promise.all([
    import("eslint-plugin-oxlint"),
    reactHooksRuleNames(),
  ]);

  // The project's own config when it passed one, this package's otherwise. See
  // `DefineConfigOptions.oxlintConfig`: a suppression here claims oxlint reports the rule, and a
  // project that turned that rule off in its own `oxlint.config.mts` has made the claim false.
  const config = (projectConfig as Oxlintrc | undefined) ?? oxlintConfigFor(packageJSON, options);
  const silentInOxlint = new Set(
    Object.entries(config.rules ?? {})
      .filter(([, severity]) => severity === "off" || severity === "allow")
      .map(([name]) => name),
  );

  return remapPrefixes(
    dropSuppressionsOxlintDoesNotEarn(
      [
        ...plugin.default.buildFromOxlintConfig(
          config as Parameters<typeof plugin.default.buildFromOxlintConfig>[0],
        ),
      ],
      silentInOxlint,
    ),
    reactHooks,
  );
}

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
 * The rules oxlint files under `react/` that ESLint spells `react-hooks/`.
 *
 * Eslint-plugin-oxlint lifts exactly two of them out of the react scope by hand — `rules-of-hooks`
 * and `exhaustive-deps` — and leaves the React Compiler set behind. Those land under a `react/`
 * prefix no plugin here registers, so the suppression matches nothing and the finding is reported
 * twice on the same line and column, once by each tool. With `respectEslintDisableDirectives:
 * false`, silencing one takes two comments under two names.
 *
 * Read from the plugin rather than listed, so the next React Compiler rule is covered on the bump
 * that introduces it rather than on the day someone notices the duplicate.
 */
async function reactHooksRuleNames(): Promise<Set<string>> {
  const plugin = (await import("eslint-plugin-react-hooks")) as unknown as {
    default?: { rules?: Record<string, unknown> };
    rules?: Record<string, unknown>;
  };

  return new Set(Object.keys(plugin.default?.rules ?? plugin.rules ?? {}));
}

function remapPrefixes(
  configs: TypedFlatConfigItem[],
  reactHooks: Set<string>,
): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (!config.rules) {
      return config;
    }

    const rules: NonNullable<TypedFlatConfigItem["rules"]> = {};

    for (const [name, entry] of Object.entries(config.rules)) {
      rules[remapRuleName(name, reactHooks)] = entry;
    }

    return { ...config, rules };
  });
}

function remapRuleName(name: string, reactHooks: Set<string>): string {
  const prefix = Object.keys(PREFIX_REMAP).find((p) => name.startsWith(p));

  if (prefix) {
    return PREFIX_REMAP[prefix] + name.slice(prefix.length);
  }

  // Only names the react-hooks plugin actually has. Everything else oxlint files under `react/` is
  // an @eslint-react rule under a different name, and inventing `react-hooks/no-clone-element`
  // would suppress nothing while looking as though it did.
  if (name.startsWith("react/") && reactHooks.has(name.slice("react/".length))) {
    return `react-hooks/${name.slice("react/".length)}`;
  }

  return name;
}
