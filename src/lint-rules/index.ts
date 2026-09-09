import { OXLINT_KNOWN_RULES } from "./oxlint-known-rules.generated";
import { PERMANENTLY_DISABLED_RULES } from "./permanent";
import { TEMPORARILY_DISABLED_RULES } from "./temporary";

export { PERMANENTLY_DISABLED_RULES } from "./permanent";
export { TEMPORARILY_DISABLED_RULES } from "./temporary";

export interface DisabledRulesOptions {
  /**
   * Apply {@link TEMPORARILY_DISABLED_RULES} — the migration backlog. Defaults to `true`.
   *
   * Set to `false` to lint against the bar the backlog is deferring: the permanent turn-offs stay,
   * everything parked for later comes back on. That is the state the backlog is shrinking towards,
   * so a project that is already clean should opt in.
   */
  temporary?: boolean | undefined;
}

/**
 * ESLint prefix → the shorter one oxlint spells the same rule with.
 *
 * Two of these exist because datamitsu-config swapped the original plugin for a maintained fork
 * that kept the rule names and changed only the prefix; oxlint still uses the original. `n/` is the
 * other direction — eslint-plugin-n shortened its own prefix years ago and oxlint kept `node/`.
 *
 * `@next/next/` → `nextjs/` is the one where a missing entry had teeth. Without it there was no
 * spelling that turned a Next.js rule off in both tools: the ESLint name failed the oxlint filter
 * and was dropped silently, the oxlint name did nothing in ESLint, and `next/…` — the shape that
 * looks like the obvious middle ground — is a plugin oxlint does not have, which fails the whole
 * config file with `Plugin 'next' not found` rather than being ignored.
 *
 * Kept identical to the copy in `scripts/generate-oxlint-known-rules.ts`, which cannot import this
 * module because it generates one of its dependencies. A name added here and not there is probed
 * under the wrong spelling and can be filtered out of the allowlist it was meant to reach.
 */
const ESLINT_TO_OXLINT_PREFIX: [string, string][] = [
  ["@next/next/", "nextjs/"],
  ["@typescript-eslint/", "typescript/"],
  ["import-x/", "import/"],
  ["jsx-a11y-x/", "jsx-a11y/"],
  ["n/", "node/"],
];

/**
 * Rules where the prefix table is not enough, because the rule's own name changed too.
 *
 * A prefix map can only express "same rule, different plugin name". These are the cases where the
 * rule was renamed as well — either because datamitsu-config swapped in a plugin that renamed it
 * (@eslint-react), because oxlint absorbed a single-rule plugin into its `react` scope
 * (react-refresh, react-prefer-function-component), or because the plugin renamed its own rule and
 * oxlint kept the old name (`unicorn/no-for-each`, which oxlint still calls `no-array-for-each`).
 *
 * Deliberately narrow. It maps one rule to _the same rule_ under another name — not one rule to a
 * different plugin's implementation of the same idea. `sonarjs/no-unused-vars` and core
 * `no-unused-vars` check the same thing and are still two entries, because parking one is not a
 * decision about the other; whether they should be linked is a question about rules, and this table
 * is about spelling.
 *
 * Applied before {@link ESLINT_TO_OXLINT_PREFIX}, so an entry here wins outright.
 */
const ESLINT_TO_OXLINT_RULE: Record<string, string> = {
  "@eslint-react/dom-no-dangerously-set-innerhtml": "react/no-danger",
  "@eslint-react/no-array-index-key": "react/no-array-index-key",
  "@eslint-react/no-clone-element": "react/no-clone-element",
  "react-prefer-function-component/react-prefer-function-component":
    "react/prefer-function-component",
  "react-refresh/only-export-components": "react/only-export-components",
  "unicorn/no-for-each": "unicorn/no-array-for-each",
};

/**
 * Plugins that re-publish core rules under their own prefix, replacing the core implementation.
 * Turning off `max-params` has to turn off `@typescript-eslint/max-params` too, or the rule simply
 * carries on reporting under a different name.
 *
 * Fired at every core rule in the list rather than at a curated subset of the ones that actually
 * have an extension: ESLint ignores a rule name it does not know as long as the severity is
 * `"off"`, including a name under a prefix whose plugin _is_ loaded, so the extra entries cost
 * nothing.
 */
const CORE_RULE_EXTENSION_PREFIXES = ["@typescript-eslint/", "@stylistic/"];

/**
 * Every rule that is disabled, in the ESLint spelling the two lists are written in.
 */
export function disabledRuleNames(options: DisabledRulesOptions = {}): string[] {
  const names = Object.keys(PERMANENTLY_DISABLED_RULES);

  if (options.temporary !== false) {
    for (const name of Object.keys(TEMPORARILY_DISABLED_RULES)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * The disabled rules as a flat-config `rules` block.
 *
 * Emitted verbatim, plus a copy under each prefix in {@link CORE_RULE_EXTENSION_PREFIXES} for core
 * rules. Names that belong to oxlint alone (`oxc/*`) are emitted as well and ESLint ignores them —
 * see {@link CORE_RULE_EXTENSION_PREFIXES} for why that is safe.
 */
export function disabledRulesForESLint(options: DisabledRulesOptions = {}): Record<string, "off"> {
  const rules: Record<string, "off"> = {};

  for (const name of disabledRuleNames(options)) {
    rules[name] = "off";

    if (!name.includes("/")) {
      for (const prefix of CORE_RULE_EXTENSION_PREFIXES) {
        rules[prefix + name] = "off";
      }
    }
  }

  return rules;
}

/**
 * The disabled rules as an oxlint `rules` block.
 *
 * Unlike ESLint, oxlint rejects the whole config file when it meets a rule or a plugin it does not
 * know — an unknown name is a hard `Failed to parse oxlint configuration file`, even at `"off"`. So
 * the list is translated into oxlint's spelling and then filtered down to what the pinned oxlint
 * build actually has; see `scripts/generate-oxlint-known-rules.ts`.
 */
export function disabledRulesForOxlint(options: DisabledRulesOptions = {}): Record<string, "off"> {
  const rules: Record<string, "off"> = {};

  for (const name of disabledRuleNames(options)) {
    const oxlintName = toOxlintRuleName(name);

    if (OXLINT_KNOWN_RULES.includes(oxlintName)) {
      rules[oxlintName] = "off";
    }
  }

  return rules;
}

/**
 * The ESLint spelling of a rule, rewritten to the one oxlint uses. Exported for the generator,
 * which has to ask oxlint about the same names this module will hand it.
 */
export function toOxlintRuleName(name: string): string {
  const alias = ESLINT_TO_OXLINT_RULE[name];

  if (alias) {
    return alias;
  }

  for (const [eslintPrefix, oxlintPrefix] of ESLINT_TO_OXLINT_PREFIX) {
    if (name.startsWith(eslintPrefix)) {
      return oxlintPrefix + name.slice(eslintPrefix.length);
    }
  }

  return name;
}
