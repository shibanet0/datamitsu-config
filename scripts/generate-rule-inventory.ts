/**
 * Maintains `src/lint-rules/rule-inventory.json` — every rule ESLint and oxlint know about, with
 * the severity this config gives it.
 *
 * The point is the diff. A plugin bump that adds, removes or re-categorises a rule is invisible
 * today: the new rule simply starts firing in whichever project upgrades first, usually long after
 * the upgrade. With the inventory committed, the same bump shows up as a reviewable diff — "this
 * rule is new, do I want it?" — and the answer is one line in
 * `src/lint-rules/permanent-disabled.ts` or `src/lint-rules/temporary.ts` before anyone else is
 * affected.
 *
 *     node scripts/generate-rule-inventory.ts           regenerate — accept the current rule set
 *     node scripts/generate-rule-inventory.ts --check   fail if the committed inventory is stale
 *
 * `--check` runs in `task validate`, and deliberately **not** in `task build`. The census is taken
 * from the built package, so a gate inside `build` could only run after the build it was gating —
 * which makes every intentional rule change fail the first build by construction, and leaves no
 * command able to accept the change without building first. Gating in `validate` keeps `refresh`
 * and pre-commit refusing a drifted set; `task rules:inventory` builds and then accepts.
 *
 * What is covered, and what deliberately is not:
 *
 * - Both halves are resolved against the same synthetic package.json, which turns on every
 *   dependency-conditional plugin (react, next, vue, vitest, playwright, storybook, i18next, clsx),
 *   so the census is the union across project shapes rather than whatever this repo happens to
 *   depend on. That matters on the oxlint side too now that its framework plugins are gated on
 *   dependencies: run in the repository root, `--print-config` would report the shape of _this_
 *   project — no react, no next, no vue — and 191 rules every consumer of those frameworks still
 *   runs would silently leave the census. Plugins datamitsu-config ships disabled by default stay
 *   out — a rule that cannot fire is noise.
 * - ESLint is resolved for a `.tsx` file and four other shapes; see {@link ESLINT_PROBES}.
 * - Oxlint is read from `oxlint --print-config`, which is authoritative: it reports the severity
 *   after categories, plugin defaults and our rule list have all been applied. No plugin flags are
 *   passed — the config decides its own plugin list, and forcing them here would keep censusing a
 *   plugin the config had stopped running.
 *
 * The same `--print-config` output is also checked for plugin coverage: every built-in plugin the
 * pinned build has must be enabled, apart from those `src/apps/oxlint/plugins.generated.ts` records
 * as deliberately off.
 */
import { execFile } from "node:child_process";
import fsPromise from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { OXLINT_EXCLUDED_PLUGINS } from "../src/apps/oxlint/plugins.generated.ts";

const execFileAsync = promisify(execFile);

const repoRoot = path.join(import.meta.dirname, "..");
const inventoryPath = path.join(repoRoot, "src/lint-rules/rule-inventory.json");
const ruleNamesPath = path.join(repoRoot, "src/lint-rules/rule-names.generated.ts");
const oxlintBin = path.join(repoRoot, "node_modules/.bin/oxlint");

interface Inventory {
  eslint: RuleMap;
  oxlint: RuleMap;
}
type RuleMap = Record<string, Severity>;

type Severity = "error" | "off" | "warn";

/**
 * Enough of a package.json to switch on every dependency-conditional ESLint plugin.
 */
const SYNTHETIC_PACKAGE_JSON = {
  // Not a dependency, but the same kind of switch: `compat` and `escompat` are gated on the project
  // declaring browser targets, so without this the census loses all 28 of their rules and
  // `compat/compat` — which is in `temporary.ts` — stops existing in `KnownRuleName`.
  browserslist: ["defaults"],
  devDependencies: {
    "@playwright/test": "*",
    "@storybook/react": "*",
    "@types/react": "*",
    clsx: "*",
    i18next: "*",
    next: "*",
    playwright: "*",
    react: "*",
    storybook: "*",
    // Gates `eslint-plugin-svelte`. The plugin and its parser both load `svelte/compiler` when the
    // config is evaluated, so this entry is what makes the 37 svelte rules exist in the census at
    // all — and what makes a plugin bump that adds one land as a reviewable diff.
    svelte: "*",
    vitest: "*",
    // oxlint-only, and load-bearing for the same reason the rest are: its `vue` plugin is gated on
    // this dependency, so without it the census loses 46 rules and a vue plugin bump lands
    // without review.
    vue: "*",
  },
  name: "rule-inventory-probe",
  private: true,
  type: "module",
  version: "0.0.0",
};

/**
 * One file per shape the config treats differently, because a single probe cannot see a block that
 * scopes itself. `probe.tsx` alone missed every vitest and playwright rule the moment those blocks
 * got the `files` they should always have had — 59 rules that silently left the census.
 */
const ESLINT_PROBES = [
  "probe.tsx",
  "__tests__/probe.test.tsx",
  "e2e/probe.spec.ts",
  "probe.cjs",
  "package.json",
  // Three shapes whose plugins scope themselves so tightly that a `.tsx` probe cannot see them at
  // all. Without these, 11 storybook rules were recorded `off` while running at `error`, and
  // `@antebudimir/eslint-plugin-vanilla-extract` was absent from the census end to end — it
  // registers its plugin *inside* the `**/*.css.ts` block, so none of its rules had a name to be
  // written down under. That is why `vanilla-extract/no-empty-style-blocks` had to be turned off
  // inline in the plugin file: no other spelling typechecked.
  "probe.stories.tsx",
  ".storybook/main.ts",
  "probe.css.ts",
  // The svelte block scopes itself the same way, to `**/*.svelte` and the rune modules. The probe
  // content is `export const probe = 1;` for every shape, which `svelte-eslint-parser` accepts as a
  // component with no markup — the census reads the resolved config, not a lint result, so nothing
  // here needs to be a realistic component.
  "probe.svelte",
  "probe.svelte.ts",
];

const SEVERITY_RANK: Record<Severity, number> = { error: 2, off: 0, warn: 1 };

function normalize(entry: unknown): Severity {
  const value = Array.isArray(entry) ? entry[0] : entry;

  switch (value) {
    case 0:
    case "allow":
    case "off": {
      return "off";
    }
    case 1:
    case "warn": {
      return "warn";
    }
    default: {
      return "error";
    }
  }
}

/**
 * `--print-config` prints plugin prefixes with underscores (`jsx_a11y/`, `react_perf/`) while a
 * config file is written with hyphens. oxlint accepts both; the inventory uses the spelling you
 * would actually type, so its keys line up with `src/lint-rules/*`.
 */
const OXLINT_PRINTED_PREFIX: [string, string][] = [
  ["jsx_a11y/", "jsx-a11y/"],
  ["react_perf/", "react-perf/"],
];

function toConfigSpelling(name: string): string {
  for (const [printed, written] of OXLINT_PRINTED_PREFIX) {
    if (name.startsWith(printed)) {
      return written + name.slice(printed.length);
    }
  }
  return name;
}

/**
 * Oxlint prefix → the longer one ESLint spells the same rule with. The mirror of
 * `ESLINT_TO_OXLINT_PREFIX` in `src/lint-rules/index.ts`, so a rule oxlint has and ESLint does not
 * can still be written in the ESLint spelling the shared lists use.
 */
const OXLINT_TO_ESLINT_PREFIX: [string, string][] = [
  ["import/", "import-x/"],
  ["jsx-a11y/", "jsx-a11y-x/"],
  ["node/", "n/"],
  ["typescript/", "@typescript-eslint/"],
];

/**
 * Refuses to census a build older than the sources it was built from.
 *
 * Both halves read `.datamitsu/*`, which are symlinks into the datamitsu store written by `dm init`
 * — so this script measures the last build, not the working tree. Nothing in lefthook's pre-commit
 * chain builds, which made the gate answer for the wrong rule set: edit `temporary.ts`, run the
 * exact pre-commit sequence, get `rule-inventory: up to date`, and commit an inventory that
 * describes the previous one. A stale pass is worse than no gate, because it reads as a review.
 *
 * Two things the obvious implementation gets wrong, both found by writing it that way first:
 *
 * - The reference is `dist-inline-eslint-config`, not the `.datamitsu` link. That link points into a
 *   content-addressed store, so its mtime is when that _content_ was first stored — unchanged by a
 *   rebuild that produces the same bytes, and therefore older than sources it is perfectly current
 *   with.
 * - Only the directories the lint config is actually built from are walked. Walking all of `src/`
 *   made the gate fire on its own build: `datamitsu-config/inline-config`,
 *   `apps/oxlint/schema.d.ts` and this script's own two build outputs are all _outputs_ that happen
 *   to live under `src/`, written after the build they came from. Listing sources is stable where
 *   listing exceptions is not — the next generated file added under `src/` would silently break the
 *   gate again.
 */
const LINT_CONFIG_SOURCES = [
  "src/apps/eslint",
  "src/apps/oxlint",
  "src/globs",
  "src/ignore",
  "src/lint-rules",
];

/**
 * Generated files inside those directories. Neither can change the built config: `schema.d.ts` and
 * `rule-names.generated.ts` are types only, which `tsdown` strips, and the inventory is read by
 * nothing at runtime.
 */
const GENERATED_IN_SOURCES = new Set([
  "src/apps/oxlint/schema.d.ts",
  "src/lint-rules/rule-inventory.json",
  "src/lint-rules/rule-names.generated.ts",
]);

async function assertBuildIsCurrent(): Promise<void> {
  const built = await fsPromise.stat(path.join(repoRoot, "dist-inline-eslint-config/index.js"));

  let newest = 0;
  let newestPath = "";

  const walk = async (directory: string): Promise<void> => {
    for (const item of await fsPromise.readdir(directory, { withFileTypes: true })) {
      const itemPath = path.join(directory, item.name);

      if (item.isDirectory()) {
        await walk(itemPath);
        continue;
      }

      if (GENERATED_IN_SOURCES.has(path.relative(repoRoot, itemPath))) {
        continue;
      }

      const { mtimeMs } = await fsPromise.stat(itemPath);

      if (mtimeMs > newest) {
        newest = mtimeMs;
        newestPath = itemPath;
      }
    }
  };

  for (const source of LINT_CONFIG_SOURCES) {
    await walk(path.join(repoRoot, source));
  }

  if (newest > built.mtimeMs) {
    process.stderr.write(
      "rule-inventory: the census reads the built package, and the build is older than\n" +
        `  ${path.relative(repoRoot, newestPath)}\n\n` +
        "Whatever this reported would describe the previous rule set. Run:\n\n" +
        "  pnpm dm exec task -- build\n\n",
    );
    process.exit(1);
  }
}

async function collectESLint(): Promise<{ configNames: string[]; rules: RuleMap }> {
  const coreRuleNames = await coreRules();
  const workDir = await fsPromise.mkdtemp(path.join(os.tmpdir(), "rule-inventory-"));
  const defineConfigURL = pathToFileURL(path.join(repoRoot, ".datamitsu/eslint.config.mjs")).href;

  await fsPromise.writeFile(
    path.join(workDir, "package.json"),
    JSON.stringify(SYNTHETIC_PACKAGE_JSON, null, 2),
    "utf8",
  );
  await fsPromise.writeFile(
    path.join(workDir, "eslint.config.mjs"),
    `import { defineConfig } from ${JSON.stringify(defineConfigURL)};\n` +
      `import packageJSON from "./package.json" with { type: "json" };\n` +
      `export default await defineConfig(packageJSON);\n`,
    "utf8",
  );
  for (const probe of ESLINT_PROBES) {
    // package.json is already there — it is the synthetic manifest, and it is also the probe for
    // how the config treats JSON.
    if (probe === "package.json") {
      continue;
    }
    await fsPromise.mkdir(path.dirname(path.join(workDir, probe)), { recursive: true });
    await fsPromise.writeFile(path.join(workDir, probe), "export const probe = 1;\n", "utf8");
  }

  const { ESLint } = await import("eslint");
  const eslint = new ESLint({ cwd: workDir });

  const rules: RuleMap = {};

  for (const probe of ESLINT_PROBES) {
    const config = (await eslint.calculateConfigForFile(path.join(workDir, probe))) as {
      plugins?: Record<string, { rules?: Record<string, unknown> }>;
      rules?: Record<string, unknown>;
    };

    // Every rule the loaded plugins expose, whether or not this config says anything about it.
    //
    // `@` — how flat config names the core rule set — is skipped here and seeded from
    // {@link coreRuleNames} instead. Its `rules` container is a Proxy with only `get` and `has`
    // traps and *zero own keys*, so `Object.keys` returns `[]` and every core rule silently missed
    // the census: 292 absent from the inventory, 108 absent from `KnownRuleName` entirely, which
    // made `"camelcase"` or `"no-restricted-syntax"` in either list a `tsc` error. An ESLint bump
    // that adds a recommended core rule produced no drift diff at all.
    for (const [pluginName, plugin] of Object.entries(config.plugins ?? {})) {
      if (pluginName === "@") {
        continue;
      }
      for (const ruleName of Object.keys(plugin.rules ?? {})) {
        rules[`${pluginName}/${ruleName}`] ??= "off";
      }
    }

    for (const ruleName of coreRuleNames) {
      rules[ruleName] ??= "off";
    }

    // …then the severity this config actually gives them. A configured name with no rule behind it
    // is one of the deliberately harmless entries `disabledRulesForESLint` shotguns out, so it is
    // skipped rather than recorded as a rule that exists.
    //
    // Across probes the strongest severity wins: the question the inventory answers is "can this
    // rule fire anywhere", and a rule scoped to test files is off in every other probe.
    for (const [ruleName, entry] of Object.entries(config.rules ?? {})) {
      if (ruleName in rules && SEVERITY_RANK[normalize(entry)] > SEVERITY_RANK[rules[ruleName]!]) {
        rules[ruleName] = normalize(entry);
      }
    }
  }

  // The block names, from the same resolution. `ConfigNames` is what `composer.override(...)`
  // autocompletes against, and it was a copy of antfu's list — sixty names that do not exist here,
  // and none of the ones that do.
  const { defineConfig } = (await import(defineConfigURL)) as {
    defineConfig: (pkg: unknown) => Promise<{ name?: string }[]>;
  };
  const configNames = [
    ...new Set(
      (await defineConfig(SYNTHETIC_PACKAGE_JSON))
        .map((item) => item.name)
        .filter((name): name is string => typeof name === "string"),
    ),
  ].sort();

  await fsPromise.rm(workDir, { force: true, recursive: true });

  return { configNames, rules: sortKeys(rules) };
}

function collectOxlint(printed: { rules?: Record<string, unknown> }): RuleMap {
  const rules: RuleMap = {};

  for (const [ruleName, entry] of Object.entries(printed.rules ?? {})) {
    rules[toConfigSpelling(ruleName)] = normalize(entry);
  }

  return sortKeys(rules);
}

/**
 * The core ESLint rule set, from the one container that is a real `Map` rather than a Proxy.
 *
 * `eslint/use-at-your-own-risk` is the documented way to reach it; the alternative — the `@` entry
 * in a resolved config's `plugins` — enumerates as empty. 292 rules.
 */
async function coreRules(): Promise<string[]> {
  const { builtinRules } = (await import("eslint/use-at-your-own-risk")) as {
    builtinRules: Map<string, unknown>;
  };

  return [...builtinRules.keys()];
}

function diff(
  before: RuleMap,
  after: RuleMap,
  spell: (name: string) => string = (name) => name,
): string[] {
  const lines: string[] = [];

  for (const [name, severity] of Object.entries(after)) {
    if (!(name in before)) {
      lines.push(`  + ${spell(name)} (${severity})`);
    } else if (before[name] !== severity) {
      lines.push(`  ~ ${spell(name)}: ${before[name]} → ${severity}`);
    }
  }

  for (const [name, value] of Object.entries(before)) {
    if (!(name in after)) {
      lines.push(`  - ${spell(name)} (was ${value})`);
    }
  }

  return lines;
}

/**
 * The config a consumer actually resolves, read back from the tool rather than from the source
 * object — which this script cannot import anyway, since it pulls in `package.json` without an
 * import attribute.
 *
 * Resolved against {@link SYNTHETIC_PACKAGE_JSON} in a scratch directory, exactly as the ESLint
 * half is, and for the same reason: the framework plugins are gated on dependencies now, so running
 * this in the repository root would census the shape of _this_ project — no react, no next, no vue
 * — and quietly drop 191 rules that every consumer of those frameworks still runs. The census has
 * to be the union across project shapes or a plugin bump lands without review.
 *
 * No plugin flags: the config decides its own plugin list, so forcing them here would hide a plugin
 * the config had dropped instead of reporting it.
 */
async function printOxlintConfig(): Promise<{
  plugins?: string[];
  rules?: Record<string, unknown>;
}> {
  const workDir = await fsPromise.mkdtemp(path.join(os.tmpdir(), "rule-inventory-oxlint-"));
  const defineConfigURL = pathToFileURL(path.join(repoRoot, ".datamitsu/oxlint.config.js")).href;

  await fsPromise.writeFile(
    path.join(workDir, "package.json"),
    JSON.stringify(SYNTHETIC_PACKAGE_JSON, null, 2),
    "utf8",
  );
  await fsPromise.writeFile(
    path.join(workDir, "oxlint.config.mts"),
    `import { defineConfig } from ${JSON.stringify(defineConfigURL)};\n` +
      `import packageJSON from "./package.json" with { type: "json" };\n` +
      `export default defineConfig(packageJSON);\n`,
    "utf8",
  );

  const { stdout } = await execFileAsync(
    oxlintBin,
    ["--print-config", "-c", path.join(workDir, "oxlint.config.mts")],
    {
      cwd: workDir,
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  return JSON.parse(stdout) as { plugins?: string[]; rules?: Record<string, unknown> };
}

function sortKeys(rules: RuleMap): RuleMap {
  const sorted: RuleMap = {};
  for (const name of Object.keys(rules).sort()) {
    sorted[name] = rules[name] as Severity;
  }
  return sorted;
}

function toESLintSpelling(name: string): string {
  for (const [oxlintPrefix, eslintPrefix] of OXLINT_TO_ESLINT_PREFIX) {
    if (name.startsWith(oxlintPrefix)) {
      return eslintPrefix + name.slice(oxlintPrefix.length);
    }
  }
  return name;
}

await assertBuildIsCurrent();

const printedOxlintConfig = await printOxlintConfig();

const { configNames, rules: eslintRules } = await collectESLint();

const inventory: Inventory = {
  eslint: eslintRules,
  oxlint: collectOxlint(printedOxlintConfig),
};

// `warn` is not a severity this config uses. datamitsu runs eslint with `--quiet`, so a warn-level
// rule reports nothing and fails nothing while still running on every file — off in every way that
// matters, minus the honesty of saying so. `defineConfig` raises every warn a plugin preset leaves
// behind; this catches the case where something slips past that, which would otherwise show up as a
// rule quietly doing nothing rather than as an error.
const warned = [...Object.entries(inventory.eslint), ...Object.entries(inventory.oxlint)]
  .filter(([, severity]) => severity === "warn")
  .map(([name]) => name);

if (warned.length > 0) {
  console.error(
    [
      `${warned.length} rule(s) resolve to "warn", which this config does not use:`,
      "",
      ...warned.map((name) => `  ${name}`),
      "",
      "Every rule is either error or off. Raise it in the plugin's config under",
      "src/apps/eslint/plugins/, or turn it off by name in src/lint-rules.",
    ].join("\n"),
  );
  process.exit(1);
}

// Every built-in plugin oxlint has must be enabled, apart from the ones `plugins.generated.ts`
// records as deliberately off. Omitting one anywhere else is not a smaller config, it is a whole
// rule set switched off with no reason written down — the thing `src/lint-rules` replaced.
// `--print-config` is read back rather than the source object, so this also catches a plugin lost
// somewhere between `src/apps/oxlint` and the file a consumer resolves.
//
// It fires on an oxlint bump that adds a plugin, too: the new rules land in the inventory diff and
// get a decision before anything ships.
const availablePlugins = (
  JSON.parse(
    await fsPromise.readFile(path.join(repoRoot, "oxlint_configuration_schema.json"), "utf8"),
  ) as { definitions: { LintPluginOptionsSchema?: { enum?: string[] } } }
).definitions.LintPluginOptionsSchema?.enum;

if (!Array.isArray(availablePlugins) || availablePlugins.length === 0) {
  throw new Error(
    "oxlint_configuration_schema.json has no `definitions.LintPluginOptionsSchema.enum` — " +
      "the schema moved the plugin list, so this check is no longer checking anything.",
  );
}

const enabledPlugins = new Set(printedOxlintConfig.plugins ?? []);
const excusedPlugins = new Set<string>([
  // The core rule set. Always on, and `--print-config` never echoes it back even when the config
  // asks for it by name, so comparing it would fail on every run.
  "eslint",
  ...OXLINT_EXCLUDED_PLUGINS,
]);
const missingPlugins = availablePlugins.filter(
  (plugin) => !excusedPlugins.has(plugin) && !enabledPlugins.has(plugin),
);

// The other half of the same guard: a plugin cannot be both excluded and running. Without this,
// deleting an entry from `EXCLUDED_PLUGINS` while the built config still carries the plugin — or the
// reverse — reads as agreement.
const contradictoryPlugins = [...OXLINT_EXCLUDED_PLUGINS].filter((plugin) =>
  enabledPlugins.has(plugin),
);

if (contradictoryPlugins.length > 0) {
  console.error(
    [
      `${contradictoryPlugins.length} oxlint plugin(s) are recorded as excluded but are running:`,
      "",
      ...contradictoryPlugins.map((plugin) => `  ${plugin}`),
      "",
      "Either drop the entry from EXCLUDED_PLUGINS in scripts/generate-oxlint-plugins.ts,",
      "or rebuild so the shipped config matches it.",
    ].join("\n"),
  );
  process.exit(1);
}

if (missingPlugins.length > 0) {
  console.error(
    [
      `${missingPlugins.length} oxlint plugin(s) the pinned build has are not enabled:`,
      "",
      ...missingPlugins.map((plugin) => `  ${plugin}`),
      "",
      "Every plugin is on; rules that are not wanted are turned off by name in src/lint-rules,",
      "where the reason is written down. Regenerate the list with:",
      "",
      "  pnpm dm exec task -- oxlint:sync:plugins",
    ].join("\n"),
  );
  process.exit(1);
}

const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

/**
 * The same census as a pair of string-literal unions, so a rule name that no longer exists — a
 * typo, or a rule a plugin dropped in an upgrade — is a type error in `permanent-disabled.ts` /
 * `temporary.ts` rather than a line that silently stops doing anything.
 *
 * Emitted as types only: `tsdown` strips them, so a stale name breaks `tsc` without blocking the
 * rebuild you need in order to regenerate this file.
 */
const union = (names: string[]) =>
  names.length === 0 ? "never" : names.map((name) => `\n  | ${JSON.stringify(name)}`).join("");

// A rule oxlint has and ESLint does not — `typescript/ban-types` outlived its ESLint counterpart —
// still gets written in the ESLint spelling, so the union has to admit that spelling too.
const oxlintAsESLint = [...new Set(Object.keys(inventory.oxlint).map(toESLintSpelling))]
  .filter((name) => !(name in inventory.eslint) && !(name in inventory.oxlint))
  .sort();

const ruleNames = `// Generated by scripts/generate-rule-inventory.ts — do not edit.
//
// Every rule name ESLint and oxlint know about, and every config block name. \`permanent-disabled.ts\` and
// \`temporary.ts\` are keyed by the rule names, so a name that stops existing stops type-checking —
// see the script for why that is the point.

// Every block name \`defineConfig\` emits, which is what \`composer.override(...)\` selects by. It
// used to be a copy of antfu's list: sixty names that do not exist in this package, and none of the
// ones that do.
// prettier-ignore
export type ConfigNames =${union(configNames)};

// prettier-ignore
export type ESLintRuleName =${union(Object.keys(inventory.eslint))};

// Declared out of dependency order because \`perfectionist/sort-modules\` wants it alphabetical, and
// type aliases hoist so the order is free.
export type KnownRuleName = ESLintRuleName | OxlintRuleName | OxlintRuleNameAsESLint;

// prettier-ignore
export type OxlintRuleName =${union(Object.keys(inventory.oxlint))};

// prettier-ignore
export type OxlintRuleNameAsESLint =${union(oxlintAsESLint)};
`;

if (process.argv.includes("--check")) {
  const committed = await fsPromise.readFile(inventoryPath, "utf8").catch(() => null);
  const committedNames = await fsPromise.readFile(ruleNamesPath, "utf8").catch(() => null);

  if (committed === null || committedNames === null) {
    console.error(`Missing generated rule files.\nRun: pnpm dm exec task -- rules:inventory`);
    process.exit(1);
  }

  if (committed !== serialized || committedNames !== ruleNames) {
    const previous = JSON.parse(committed) as Inventory;
    const changes = [
      ...diff(previous.eslint, inventory.eslint).map((line) => `eslint${line}`),
      ...diff(previous.oxlint, inventory.oxlint, toESLintSpelling).map((line) => `oxlint${line}`),
    ];

    console.error(
      [
        "The lint rule set changed and the committed inventory no longer matches it.",
        "",
        ...(changes.length > 0
          ? changes
          : ["  (no rule changed — the config block names did, see ConfigNames)"]),
        "",
        "Names are shown in the ESLint spelling the lists are written in, ready to paste.",
        "",
        "Decide what each rule should be — leave it on, or add it to src/lint-rules/permanent-disabled.ts",
        "or src/lint-rules/temporary.ts with a reason — then accept the new set with:",
        "",
        "  pnpm dm exec task -- rules:inventory",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(
    `rule-inventory: up to date (${Object.keys(inventory.eslint).length} eslint, ${Object.keys(inventory.oxlint).length} oxlint)`,
  );
} else {
  await fsPromise.writeFile(inventoryPath, serialized, "utf8");
  await fsPromise.writeFile(ruleNamesPath, ruleNames, "utf8");
  console.log(
    `rule-inventory: wrote ${Object.keys(inventory.eslint).length} eslint + ${Object.keys(inventory.oxlint).length} oxlint rules`,
  );
}
