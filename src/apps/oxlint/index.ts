import type { Oxlintrc } from "./schema";

import { name } from "../../../package.json";
import { disabledRulesForOxlint } from "../../lint-rules";

/**
 * Rules datamitsu-config turns _on_ beyond what the categories already enable.
 *
 * Everything that gets turned _off_ lives in `src/lint-rules` instead, shared with ESLint — see
 * {@link oxlintConfig}.
 */
const enabled: Oxlintrc["rules"] = {
  "one-var": ["error", "never"],
};

/**
 * The oxlint half of the shared lint configuration.
 *
 * Every category is on, including `restriction` — which, unlike the others, is not a quality bar
 * but a bag of project-specific bans that oxlint expects you to opt into one rule at a time.
 * Turning it on lights up every rule at once, so the ones this stack does not want are turned off
 * by name in `src/lint-rules` rather than by leaving the category off. A project that wants the
 * backlog rules back on re-enables them in its own `.oxlintrc.json`, which extends this one.
 *
 * That list is shared with ESLint on purpose. `eslint-plugin-oxlint` suppresses an ESLint rule only
 * while oxlint is _reporting_ the equivalent, so turning a rule off here used to hand it straight
 * back to ESLint — the same finding, same file, still failing, now under a different rule name.
 * Feeding both tools the same list is what stops that.
 */
export const oxlintConfig: Oxlintrc = {
  $schema: `./node_modules/${name}/oxlint_configuration_schema.json`,
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    restriction: "error",
    style: "error",
    suspicious: "error",
  },
  // Type-aware linting, run by `oxlint-tsgolint` against the project's tsconfig. It is what makes
  // rules like `no-floating-promises` possible at all — they cannot be decided from syntax alone.
  // Cheap enough to leave on: the engine is Go, not the TypeScript compiler's checker.
  options: {
    typeAware: true,
  },
  rules: {
    ...enabled,
    ...disabledRulesForOxlint(),
  },
};
