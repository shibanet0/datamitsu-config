import type { Oxlintrc } from "./schema";

import { name } from "../../../package.json";

const finalized: Oxlintrc["rules"] = {
  "sort-keys": "off",
  "unicorn/prefer-query-selector": "off", // http://jsben.ch/8tEs3
  "unicorn/prefer-string-raw": "off",
  "one-var": ["error", "never"],
};

/**
 * TODO(restriction): triage backlog.
 *
 * The `restriction` category is enabled deliberately, but unlike the other categories it is not a
 * quality bar — it is a bag of project-specific bans that oxlint expects you to opt into one rule
 * at a time. Turning it on lights up every rule at once, so the ones that currently fire are parked
 * here instead of leaving the category off. Work through them and re-enable selectively; the goal
 * is to shrink this list, not to clear it.
 *
 * Counts are occurrences under `src/` + `scripts/` at the time of writing — rough triage order.
 *
 * The first four also fire on the config files `datamitsu init` generates (`datamitsu.config.js`,
 * `eslint.config.mjs`). Those must stay off, or every fresh init fails before the consumer has
 * written a line of their own code — which is exactly what broke the fresh-init smoke test.
 */
const restrictionTriage: Oxlintrc["rules"] = {
  "no-implicit-globals": "off", // 2 — also fires in generated config
  "no-undefined": "off", // 55 — also fires in generated config
  "oxc/no-rest-spread-properties": "off", // 162 — also fires in generated config
  "unicorn/import-style": "off", // 15 — also fires in generated config

  "class-methods-use-this": "off", // 3
  complexity: "off", // 2
  "max-params": "off", // 4
  "no-bitwise": "off", // 4
  "no-console": "off", // 113
  "no-continue": "off", // 9
  "no-empty-function": "off", // 9
  "no-eq-null": "off", // 2
  "no-nested-ternary": "off", // 1
  "no-plusplus": "off", // 10
  "no-template-curly-in-string": "off", // 1
  "no-underscore-dangle": "off", // 4
  "no-use-before-define": "off", // 71
  "oxc/no-async-await": "off", // 213
  "oxc/no-optional-chaining": "off", // 82
  "prefer-named-capture-group": "off", // 19
  "require-unicode-regexp": "off", // 47
  "typescript/consistent-type-imports": "off", // 1
  "typescript/explicit-function-return-type": "off", // 31
  "typescript/explicit-member-accessibility": "off", // 34
  "typescript/explicit-module-boundary-types": "off", // 10
  "typescript/method-signature-style": "off", // 41
  "typescript/no-dynamic-delete": "off", // 1
  "typescript/no-explicit-any": "off", // 106
  "typescript/no-import-type-side-effects": "off", // 1
  "typescript/no-non-null-assertion": "off", // 47
  "unicorn/max-nested-calls": "off", // 2
  "unicorn/no-abusive-eslint-disable": "off", // 4
  "unicorn/no-array-for-each": "off", // 1
  "unicorn/no-array-reduce": "off", // 7
  "unicorn/no-nested-ternary": "off", // 1
  "unicorn/no-process-exit": "off", // 39
  "unicorn/prefer-module": "off", // 2
  "unicorn/prefer-number-coercion": "off", // 4
  "unicorn/prefer-number-properties": "off", // 4
  "unicorn/prefer-single-call": "off", // 22
};

export const oxlintConfig: Oxlintrc = {
  $schema: `./node_modules/${name}/oxlint_configuration_schema.json`,
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    style: "error",
    suspicious: "error",
    restriction: "error",
  },
  rules: {
    ...finalized,
    ...restrictionTriage,
    "array-type": "off",
    "arrow-body-style": "off",
    "capitalized-comments": "off",
    eqeqeq: "off",
    "func-names": "off",
    "func-style": "off",
    "id-length": "off",
    "init-declarations": "off",
    "max-lines": "off",
    "max-lines-per-function": "off",
    "max-statements": "off",
    "no-await-in-loop": "off",
    "no-inline-comments": "off",
    "no-magic-numbers": "off",
    "no-ternary": "off",
    "no-unused-vars": "off",
    "no-warning-comments": "off",
    "prefer-destructuring": "off",
    "prefer-template": "off",
    "require-await": "off",
    "sort-imports": "off",
    "triple-slash-reference": "off",
    "unicorn/filename-case": "off",
    "unicorn/no-array-sort": "off",
    "unicorn/no-null": "off",

    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/number-literal-case": "off",
    "unicorn/require-module-specifiers": "off",
  },
};
