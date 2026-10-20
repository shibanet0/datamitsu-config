import { OXLINT_KNOWN_RULES } from "./oxlint-known-rules.generated";
import { PERMANENTLY_DISABLED_RULES } from "./permanent-disabled";
import { PERMANENTLY_ENABLED_RULES } from "./permanent-enabled";
import { toOxlintRuleName } from "./rule-mapping";
import { TEMPORARILY_DISABLED_RULES } from "./temporary";

export { PERMANENTLY_DISABLED_RULES } from "./permanent-disabled";
export { enabledRulesForESLint } from "./permanent-enabled";
export { toOxlintRuleName } from "./rule-mapping";
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
 * The enabled rules in the spelling oxlint uses, translated the same way the disabled ones are.
 *
 * Filtered against the pinned build for the same reason: an unknown name is a hard config-parse
 * failure. A rule oxlint does not have simply stays ESLint to report.
 */
export function enabledRulesForOxlint(): Record<string, unknown[]> {
  const rules: Record<string, unknown[]> = {};

  for (const [name, rule] of Object.entries(PERMANENTLY_ENABLED_RULES)) {
    const oxlintName = toOxlintRuleName(name);

    if (OXLINT_KNOWN_RULES.includes(oxlintName)) {
      rules[oxlintName] = ["error", ...(rule?.options ?? [])];
    }
  }

  return rules;
}
