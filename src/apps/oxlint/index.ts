import type { Oxlintrc } from "./schema";

import { name } from "../../../package.json";

const finalized: Oxlintrc["rules"] = {
  "sort-keys": "off",
  "unicorn/prefer-query-selector": "off", // http://jsben.ch/8tEs3
  "unicorn/prefer-string-raw": "off",
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
