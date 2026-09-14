/**
 * Rules that must stay on, and the options they must stay on with.
 *
 * The other two lists record every rule that is off, each with a reason. Nothing recorded what was
 * left on — and "on" was whatever survived after the plugin presets and oxlint's categories
 * decided. A residual set has no author, no reason, and no protection: a plugin bump that drops a
 * rule from its `recommended` preset turns it off, and the only trace is a line in the census diff
 * that somebody has to notice.
 *
 * This list is the third verdict. It is deliberately **not** a mirror of the off-lists:
 *
 * - It is small on purpose. Writing down every rule anyone is happy with would be a hand-maintained
 *   copy of `rule-inventory.json` — two thousand entries that nobody sustains and that drift from
 *   the census they duplicate. An entry belongs here only when losing it silently should fail the
 *   build, when it needs options the defaults get wrong, or when a preset is likely to move it.
 * - It carries options, which the off-lists cannot. That gap is why `eqeqeq` had to be written by
 *   hand into `src/apps/oxlint/index.ts` _and_ `src/apps/eslint/plugins/javascript.ts` — the two
 *   places AGENTS.md says rules must not be configured. Worse, only one of those copies was ever
 *   read: `eslint-plugin-oxlint` turns the ESLint one off because oxlint reports it, so the ESLint
 *   options sat there doing nothing.
 * - It asserts rather than assumes. Turning a rule _off_ in both tools is idempotent, which is why
 *   the off-lists can be shared blindly. Turning one _on_ in both is not — that is the same finding
 *   reported twice under two names. So the check here is that **at least one** tool reports the
 *   rule at error, not that both do; which one is the handoff's business, not ours.
 *
 * The gate lives in `scripts/validate-lint-rule-lists.ts`, which reads the committed census. This
 * file only declares; it cannot itself drift from what the tools do.
 */
import type { KnownRuleName } from "./rule-names.generated";

export interface PermanentlyEnabledRule {
  /**
   * The rule's options, appended after `"error"` and given to both tools. Omitted when the entry
   * only pins the rule on and the defaults are already right.
   */
  options?: readonly unknown[];

  /**
   * Why this rule silently going off should fail the build rather than land in a diff.
   */
  reason: string;
}

export const PERMANENTLY_ENABLED_RULES: Partial<Record<KnownRuleName, PermanentlyEnabledRule>> = {
  /**
   * The other half of a sentence already written in `permanent-disabled.ts`. `no-eq-null` is off
   * there because `== null` is the idiomatic null-or-undefined check and "eqeqeq covers the rest" —
   * which is only true with `{ null: "ignore" }`. oxlint's categories switch `eqeqeq` on without
   * it, so the two lists disagreed until the options were set by hand in both configs.
   */
  eqeqeq: {
    options: ["always", { null: "ignore" }],
    reason: "the null exception is what makes no-eq-null a decision rather than a hole",
  },
  /**
   * One declaration per binding. The default (`"always"`) is the opposite of what this stack does,
   * so leaving the rule at its defaults would be worse than leaving it off.
   */
  "one-var": {
    options: ["never"],
    reason: "the default demands a single combined declaration, which is the opposite convention",
  },
};

/**
 * The enabled rules as a flat-config `rules` block, in the ESLint spelling.
 *
 * Applied before `eslint-plugin-oxlint`'s block, so the handoff can still take a rule over when
 * oxlint reports it. That is the point: the options are declared once and reach whichever tool ends
 * up doing the reporting.
 */
export function enabledRulesForESLint(): Record<string, unknown[]> {
  const rules: Record<string, unknown[]> = {};

  for (const [name, rule] of Object.entries(PERMANENTLY_ENABLED_RULES)) {
    rules[name] = ["error", ...(rule?.options ?? [])];
  }

  return rules;
}
