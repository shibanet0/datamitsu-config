/**
 * Checks `src/lint-rules/{permanent-disabled,permanent-enabled,temporary}.ts` as _lists_, which
 * nothing else does.
 *
 * `validate:rule-inventory` compares the rule set against the committed census, and
 * `oxlint-known-rules.generated.ts` guarantees only that the names surviving the filter parse. Both
 * are blind to the failure this script exists for: an entry that is written down, typechecks, and
 * turns the rule off in **one** tool while leaving it live in the other. The author reads a list
 * that says "off" and the build fails on a rule they believe they parked.
 *
 * That is not hypothetical — it is the shape of every translation bug this repository has hit: the
 * missing `n/` ↔ `node/` mapping, the missing `@next/next/` ↔ `nextjs/` mapping, the React family
 * that oxlint spells under `react/`, and `unicorn/no-array-for-each` vs `no-for-each`. Each was
 * found by a person noticing a rule firing, not by a gate.
 *
 * Nothing here judges whether a rule _should_ be off. It only checks that what the lists say is
 * what the two tools do. Run it while parking rules in bulk: the report is meant to be worked
 * through, and the spelling column is meant to be pasted.
 *
 * Deliberately not wired into `task validate` yet — see the note printed at the end.
 */
import fsPromise from "node:fs/promises";
import path from "node:path";

import { OXLINT_KNOWN_RULES } from "../src/lint-rules/oxlint-known-rules.generated.ts";
import { PERMANENTLY_DISABLED_RULES } from "../src/lint-rules/permanent-disabled.ts";
import { PERMANENTLY_ENABLED_RULES } from "../src/lint-rules/permanent-enabled.ts";
import { TEMPORARILY_DISABLED_RULES } from "../src/lint-rules/temporary.ts";

const repoRoot = path.join(import.meta.dirname, "..");

/**
 * Same table as `src/lint-rules/index.ts`, read the other way: what an entry written in oxlint's
 * spelling should have been written as.
 *
 * `eslint/` is oxlint's name for the core set, which carries no prefix at all in ESLint.
 */
const OXLINT_TO_ESLINT_PREFIX: [string, string][] = [
  ["eslint/", ""],
  ["import/", "import-x/"],
  ["jsx-a11y/", "jsx-a11y-x/"],
  ["nextjs/", "@next/next/"],
  ["node/", "n/"],
  ["typescript/", "@typescript-eslint/"],
];

/**
 * Oxlint prefixes with no mechanical ESLint counterpart, and why.
 *
 * These cannot be fixed by rewriting the prefix: the ESLint plugin renamed the rules themselves, or
 * there is no ESLint plugin in this config at all. An entry under one of them is a decision to
 * make, not a typo to correct.
 */
const UNTRANSLATABLE_OXLINT_PREFIX: Record<string, string> = {
  "react-perf/": "no ESLint counterpart is loaded — oxlint-only, so the entry reaches only oxlint",
  "react/": "@eslint-react renamed the rules, not just the prefix — needs an explicit alias",
  "vue/": "no ESLint counterpart is loaded — oxlint-only, so the entry reaches only oxlint",
};

/**
 * Reasons that restate the observation instead of giving one. `"-"` and `"off"` are what a bulk
 * park leaves behind; `"N eslint configs"` records where the rule was found, which is provenance,
 * not a justification.
 */
const PLACEHOLDER_REASON = /^(-|off|off in datamitsu-config|\d+ (eslint|oxlint) configs?)$/;

interface Entry {
  list: "permanent" | "temporary";
  reason: string;
  rule: string;
}

interface Problem {
  detail: string;
  entry: Entry;
  fix?: string;
}

const entries: Entry[] = [
  ...Object.entries(PERMANENTLY_DISABLED_RULES).map(([rule, reason]): Entry => ({
    list: "permanent",
    reason: reason ?? "",
    rule,
  })),
  ...Object.entries(TEMPORARILY_DISABLED_RULES).map(([rule, reason]): Entry => ({
    list: "temporary",
    reason: reason ?? "",
    rule,
  })),
];

const inventory = JSON.parse(
  await fsPromise.readFile(path.join(repoRoot, "src/lint-rules/rule-inventory.json"), "utf8"),
) as { eslint: Record<string, string>; oxlint: Record<string, string> };

function bareName(rule: string): string {
  return rule.slice(rule.lastIndexOf("/") + 1);
}

function toOxlintRuleName(name: string): string {
  for (const [oxlintPrefix, eslintPrefix] of OXLINT_TO_ESLINT_PREFIX) {
    if (eslintPrefix !== "" && name.startsWith(eslintPrefix)) {
      return oxlintPrefix + name.slice(eslintPrefix.length);
    }
  }

  return name;
}

// ---------------------------------------------------------------------------
// Written in oxlint's spelling. The lists are ESLint-spelled; `index.ts` translates one way
//    only, so an oxlint-spelled entry reaches oxlint and does nothing at all in ESLint.
// ---------------------------------------------------------------------------

const wrongSpelling: Problem[] = [];

for (const entry of entries) {
  const untranslatable = Object.keys(UNTRANSLATABLE_OXLINT_PREFIX).find((p) =>
    entry.rule.startsWith(p),
  );

  if (untranslatable) {
    wrongSpelling.push({
      detail: UNTRANSLATABLE_OXLINT_PREFIX[untranslatable] as string,
      entry,
    });
    continue;
  }

  const pair = OXLINT_TO_ESLINT_PREFIX.find(
    ([oxlintPrefix]) => oxlintPrefix !== "" && entry.rule.startsWith(oxlintPrefix),
  );

  if (pair) {
    const [oxlintPrefix, eslintPrefix] = pair;
    const corrected = eslintPrefix + entry.rule.slice(oxlintPrefix.length);

    wrongSpelling.push({
      detail: "oxlint spelling — reaches oxlint, does nothing in ESLint",
      entry,
      fix: corrected,
    });
  }
}

// ---------------------------------------------------------------------------
// One-sided park. The entry is dropped by the known-rules filter, yet oxlint has a rule with the
//    same bare name and is reporting it. This is the failure the shared list exists to prevent.
// ---------------------------------------------------------------------------

const oneSided: Problem[] = [];

for (const entry of entries) {
  const oxlintName = toOxlintRuleName(entry.rule);

  if (OXLINT_KNOWN_RULES.includes(oxlintName)) {
    continue;
  }

  const bare = bareName(entry.rule);
  const twin = Object.keys(inventory.oxlint).find(
    (name) => bareName(name) === bare && inventory.oxlint[name] !== "off",
  );

  if (twin) {
    oneSided.push({
      detail: `dropped for oxlint; oxlint has \`${twin}\` at ${inventory.oxlint[twin]}`,
      entry,
      fix: twin,
    });
  }
}

// ---------------------------------------------------------------------------
// Turned off in a plugin file and recorded nowhere. AGENTS.md says the two lists are the only
//    place a rule goes off; a literal in a plugin file is a decision with no reason next to it,
//    invisible to the census diff and to every consumer reading the lists.
// ---------------------------------------------------------------------------

const offOutsideTheLists: { file: string; line: number; rule: string }[] = [];

// ---------------------------------------------------------------------------
// Turned off somewhere else as well. A duplicate `"off"` in a plugin file resolves before
//    `s0/disabled-rules`, so deleting the list entry during triage changes nothing.
// ---------------------------------------------------------------------------

const alsoOffElsewhere: Problem[] = [];
const pluginDirectory = path.join(repoRoot, "src/apps/eslint/plugins");
const listedRules = new Set(entries.map((entry) => entry.rule));

for (const file of (await fsPromise.readdir(pluginDirectory)).filter((f) => f.endsWith(".ts"))) {
  const source = await fsPromise.readFile(path.join(pluginDirectory, file), "utf8");

  source.split("\n").forEach((line, index) => {
    const match = /^\s*"?([@a-zA-Z0-9_/-]+)"?:\s*(?:"off"|\[\s*"off")/.exec(line);

    if (!match?.[1]) {
      return;
    }

    if (listedRules.has(match[1])) {
      const entry = entries.find((candidate) => candidate.rule === match[1]) as Entry;

      alsoOffElsewhere.push({
        detail: `also "off" at plugins/${file}:${index + 1}`,
        entry,
      });

      return;
    }

    offOutsideTheLists.push({ file, line: index + 1, rule: match[1] });
  });
}

// ---------------------------------------------------------------------------
// In both lists. A rule cannot be both a decision and a deferral.
// ---------------------------------------------------------------------------

const inBothLists = Object.keys(TEMPORARILY_DISABLED_RULES).filter(
  (rule) => rule in PERMANENTLY_DISABLED_RULES,
);

// ---------------------------------------------------------------------------
// One check under two prefixes across the two lists — `unicorn/no-array-for-each` in
//    `permanent` and `unicorn/no-for-each` in `temporary` is one rule with two verdicts, and each
//    spelling reaches a different tool.
// ---------------------------------------------------------------------------

const byBareName = new Map<string, Entry[]>();

for (const entry of entries) {
  const bare = bareName(entry.rule);
  byBareName.set(bare, [...(byBareName.get(bare) ?? []), entry]);
}

const splitVerdicts = [...byBareName.entries()].filter(
  ([, group]) =>
    group.length > 1 &&
    new Set(group.map((entry) => entry.list)).size > 1 &&
    new Set(group.map((entry) => entry.rule)).size > 1,
);

// ---------------------------------------------------------------------------
// Reasons that are not reasons.
// ---------------------------------------------------------------------------

const placeholders = entries.filter((entry) => PLACEHOLDER_REASON.test(entry.reason.trim()));

// ---------------------------------------------------------------------------
// A rule the config guarantees that neither tool is actually reporting. This is the check that
// makes `permanent-enabled.ts` worth having: without it the list is a wish, and a plugin bump that
// drops a rule from its recommended preset turns it off with nothing but a census diff to say so.
//
// At least one tool, not both. `eslint-plugin-oxlint` deliberately leaves exactly one of them
// reporting — requiring both would demand the double diagnostics the handoff exists to prevent.
// ---------------------------------------------------------------------------

const notEnforced: { name: string; reason: string; severities: string }[] = [];

for (const [name, rule] of Object.entries(PERMANENTLY_ENABLED_RULES)) {
  const inESLint = inventory.eslint[name];
  const inOxlint = inventory.oxlint[toOxlintRuleName(name)];

  if (inESLint !== "error" && inOxlint !== "error") {
    notEnforced.push({
      name,
      reason: rule?.reason ?? "",
      severities: `eslint ${inESLint ?? "absent"}, oxlint ${inOxlint ?? "absent"}`,
    });
  }
}

// ---------------------------------------------------------------------------

function heading(title: string, count: number): void {
  process.stdout.write(`\n${title} — ${count}\n${"─".repeat(72)}\n`);
}

let failed = false;

if (notEnforced.length > 0) {
  failed = true;
  heading("Declared as permanently enabled, reported by neither tool", notEnforced.length);
  for (const { name, reason, severities } of notEnforced) {
    process.stdout.write(`  ${name}\n      ! ${severities}\n      → ${reason}\n`);
  }
}

if (wrongSpelling.length > 0) {
  failed = true;
  heading("Written in oxlint's spelling (does nothing in ESLint)", wrongSpelling.length);
  for (const { detail, entry, fix } of wrongSpelling) {
    process.stdout.write(
      fix ? `  ${entry.rule}\n      → rename to  ${fix}\n` : `  ${entry.rule}\n      ! ${detail}\n`,
    );
  }
}

if (oneSided.length > 0) {
  failed = true;
  heading("Parked in ESLint, possibly still live in oxlint", oneSided.length);
  process.stdout.write(
    "  Matched on the bare rule name across plugins, so each of these needs a look:\n" +
      "  a same-named rule under a different plugin may or may not be the same check.\n" +
      "  Where it is, add the alias so one entry reaches both tools.\n\n",
  );
  for (const { detail, entry } of oneSided) {
    process.stdout.write(`  ${entry.rule}\n      ? ${detail}\n`);
  }
}

if (offOutsideTheLists.length > 0) {
  failed = true;
  heading("Turned off in a plugin file, recorded in neither list", offOutsideTheLists.length);
  process.stdout.write(
    "  A decision with no reason next to it, invisible to the census diff and to anyone\n" +
      "  reading the lists. Move each into permanent-disabled.ts or temporary.ts with a reason.\n\n",
  );
  for (const { file, line, rule } of offOutsideTheLists) {
    process.stdout.write(`  ${rule.padEnd(52)} plugins/${file}:${line}\n`);
  }
}

if (alsoOffElsewhere.length > 0) {
  failed = true;
  heading(
    "Also turned off outside the lists (deleting the entry is a no-op)",
    alsoOffElsewhere.length,
  );
  for (const { detail, entry } of alsoOffElsewhere) {
    process.stdout.write(`  ${entry.rule}\n      ! ${detail}\n`);
  }
}

if (inBothLists.length > 0) {
  failed = true;
  heading("In both lists", inBothLists.length);
  for (const rule of inBothLists) {
    process.stdout.write(`  ${rule}\n`);
  }
}

if (splitVerdicts.length > 0) {
  failed = true;
  heading("One check, two spellings, two verdicts", splitVerdicts.length);
  for (const [bare, group] of splitVerdicts) {
    process.stdout.write(`  ${bare}\n`);
    for (const entry of group) {
      process.stdout.write(`      ${entry.list.padEnd(9)} ${entry.rule}\n`);
    }
  }
}

if (placeholders.length > 0) {
  failed = true;
  heading("Reason restates the observation instead of giving one", placeholders.length);
  for (const entry of placeholders) {
    process.stdout.write(`  ${entry.rule.padEnd(56)} "${entry.reason}"\n`);
  }
}

process.stdout.write(
  `\n${"═".repeat(72)}\n` +
    `${entries.length} entries checked ` +
    `(${Object.keys(PERMANENTLY_DISABLED_RULES).length} permanent, ` +
    `${Object.keys(TEMPORARILY_DISABLED_RULES).length} temporary)\n`,
);

if (!failed) {
  process.stdout.write("lint-rule lists: clean\n");
  process.exit(0);
}

process.stdout.write(
  "\nThe first three sections are correctness, not style: each one is a rule the lists\n" +
    "claim is off that at least one tool is still enforcing, or that deleting will not\n" +
    "re-enable. The last three are what makes the backlog possible to triage later.\n" +
    "\nNot yet part of `task validate` — add it there once the lists are clean, so the\n" +
    "corpus cannot drift again the way it drifted into this state.\n",
);

process.exit(1);
