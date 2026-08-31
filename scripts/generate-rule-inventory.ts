/**
 * Maintains `src/lint-rules/rule-inventory.json` — every rule ESLint and oxlint know about, with
 * the severity this config gives it.
 *
 * The point is the diff. A plugin bump that adds, removes or re-categorises a rule is invisible
 * today: the new rule simply starts firing in whichever project upgrades first, usually long after
 * the upgrade. With the inventory committed, the same bump shows up as a reviewable diff — "this
 * rule is new, do I want it?" — and the answer is one line in `src/lint-rules/permanent.ts` or
 * `src/lint-rules/temporary.ts` before anyone else is affected.
 *
 * Node scripts/generate-rule-inventory.ts regenerate (accept the current rule set) node
 * scripts/generate-rule-inventory.ts --check fail if the committed inventory is stale
 *
 * `--check` runs as part of `task build`, so the build refuses to produce a package whose rule set
 * has drifted from the one that was last reviewed.
 *
 * What is covered, and what deliberately is not:
 *
 * - ESLint is resolved for a `.tsx` file against a synthetic package.json that turns on every
 *   dependency-conditional plugin (react, vitest, playwright, storybook, i18next, clsx), so the
 *   census is the union across project shapes rather than whatever this repo happens to depend on.
 *   Plugins datamitsu-config ships disabled by default stay out — a rule that cannot fire is
 *   noise.
 * - Oxlint is read from `oxlint --print-config`, which is authoritative: it reports the severity
 *   after categories, plugin defaults and our rule list have all been applied. Every optional
 *   plugin is switched on for the same reason as above.
 */
import { execFile } from "node:child_process";
import fsPromise from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

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
 * Oxlint plugins that are off unless asked for. Enabled here so the census covers every rule.
 */
const OXLINT_OPTIONAL_PLUGINS = [
  "--import-plugin",
  "--jest-plugin",
  "--jsdoc-plugin",
  "--jsx-a11y-plugin",
  "--nextjs-plugin",
  "--node-plugin",
  "--promise-plugin",
  "--react-perf-plugin",
  "--react-plugin",
  "--vitest-plugin",
  "--vue-plugin",
];

/**
 * Enough of a package.json to switch on every dependency-conditional ESLint plugin.
 */
const SYNTHETIC_PACKAGE_JSON = {
  devDependencies: {
    "@storybook/react": "*",
    "@types/react": "*",
    clsx: "*",
    i18next: "*",
    playwright: "*",
    react: "*",
    storybook: "*",
    vitest: "*",
  },
  name: "rule-inventory-probe",
  private: true,
  type: "module",
  version: "0.0.0",
};

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
  ["typescript/", "@typescript-eslint/"],
];

async function collectESLint(): Promise<RuleMap> {
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
  await fsPromise.writeFile(path.join(workDir, "probe.tsx"), "export const probe = 1;\n", "utf8");

  const { ESLint } = await import("eslint");
  const eslint = new ESLint({ cwd: workDir });
  const config = (await eslint.calculateConfigForFile(path.join(workDir, "probe.tsx"))) as {
    plugins?: Record<string, { rules?: Record<string, unknown> }>;
    rules?: Record<string, unknown>;
  };

  const rules: RuleMap = {};

  // Every rule the loaded plugins expose, whether or not this config says anything about it. `@` is
  // how flat config names the core rule set; its rules carry no prefix.
  for (const [pluginName, plugin] of Object.entries(config.plugins ?? {})) {
    const prefix = pluginName === "@" ? "" : `${pluginName}/`;
    for (const ruleName of Object.keys(plugin.rules ?? {})) {
      rules[prefix + ruleName] = "off";
    }
  }

  // …then the severity this config actually gives them. A configured name with no rule behind it is
  // one of the deliberately harmless entries `disabledRulesForESLint` shotguns out, so it is skipped
  // rather than recorded as a rule that exists.
  for (const [ruleName, entry] of Object.entries(config.rules ?? {})) {
    if (ruleName in rules) {
      rules[ruleName] = normalize(entry);
    }
  }

  await fsPromise.rm(workDir, { force: true, recursive: true });

  return sortKeys(rules);
}

async function collectOxlint(): Promise<RuleMap> {
  const { stdout } = await execFileAsync(
    oxlintBin,
    ["--print-config", ...OXLINT_OPTIONAL_PLUGINS],
    { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
  );

  const printed = JSON.parse(stdout) as { rules?: Record<string, unknown> };
  const rules: RuleMap = {};

  for (const [ruleName, entry] of Object.entries(printed.rules ?? {})) {
    rules[toConfigSpelling(ruleName)] = normalize(entry);
  }

  return sortKeys(rules);
}

function diff(before: RuleMap, after: RuleMap): string[] {
  const lines: string[] = [];

  for (const [name, severity] of Object.entries(after)) {
    if (!(name in before)) {
      lines.push(`  + ${name} (${severity})`);
    } else if (before[name] !== severity) {
      lines.push(`  ~ ${name}: ${before[name]} → ${severity}`);
    }
  }

  for (const [name, value] of Object.entries(before)) {
    if (!(name in after)) {
      lines.push(`  - ${name} (was ${value})`);
    }
  }

  return lines;
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

const inventory: Inventory = {
  eslint: await collectESLint(),
  oxlint: await collectOxlint(),
};

const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

/**
 * The same census as a pair of string-literal unions, so a rule name that no longer exists — a
 * typo, or a rule a plugin dropped in an upgrade — is a type error in `permanent.ts` /
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
// Every rule name ESLint and oxlint know about. \`permanent.ts\` and \`temporary.ts\` are keyed by
// these, so a name that stops existing stops type-checking — see the script for why that is the
// point.

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
      ...diff(previous.oxlint, inventory.oxlint).map((line) => `oxlint${line}`),
    ];

    console.error(
      [
        "The lint rule set changed and the committed inventory no longer matches it.",
        "",
        ...changes,
        "",
        "Decide what each rule should be — leave it on, or add it to src/lint-rules/permanent.ts",
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
