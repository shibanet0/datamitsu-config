import type { Oxlintrc } from "./schema";

import { name } from "../../../package.json";

const finalized: Oxlintrc["rules"] = {
  "sort-keys": "off",
  "unicorn/prefer-query-selector": "off", // http://jsben.ch/8tEs3
  "unicorn/prefer-string-raw": "off",
};

/**
 * TODO(eslint-10): rules oxlint added to the enabled categories between 1.58 and 1.77, switched off
 * so the ESLint 10 upgrade did not turn into a codebase-wide refactor. Each still needs a
 * decision.
 *
 * Counts are diagnostics observed in this repository at the time of the upgrade.
 */
const addedInOxlint177: Oxlintrc["rules"] = {
  "method-signature-style": "off", // typescript, 41 warnings
  "no-underscore-dangle": "off", // eslint, 6 errors
  "prefer-named-capture-group": "off", // eslint, 19 warnings
  "require-unicode-regexp": "off", // eslint, 48 errors
  "unicorn/max-nested-calls": "off", // 3 warnings
  "unicorn/prefer-number-coercion": "off", // 4 errors
  "unicorn/prefer-single-call": "off", // 1 error
};

export const oxlintConfig: Oxlintrc = {
  $schema: `./node_modules/${name}/oxlint_configuration_schema.json`,
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    style: "warn",
    suspicious: "error",
  },
  rules: {
    ...finalized,
    ...addedInOxlint177,
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
