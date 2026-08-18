import { globalIgnores } from "@eslint/config-helpers";
import { join } from "node:path";

import { defineConfig } from "./.datamitsu/eslint.config.mjs";
import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
  /**
   * @type {import("./dist/type-fest").PackageJson}
   */ (packageJSON),
  undefined,
  {
    plugins: {
      e18e: {
        disabled: true,
      },
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
      react: {
        version: "19.2.3",
      },
    },
    react: true,
  },
);

export default [
  globalIgnores([".datamitsu/"]),
  ...config,
  {
    rules: {
      "playwright/no-standalone-expect": "off",
      "unicorn/no-object-as-default-parameter": "off",
      "unicorn/name-replacements": "off",
      "unicorn/no-global-object-property-assignment": "off",
      "sonarjs/parameterized-tests": "off",
      "unicorn/prefer-iterator-to-array": "off",
      "unicorn/prefer-split-limit": "off",
      "unicorn/no-declarations-before-early-exit": "off",
      "unicorn/require-array-sort-compare": "off",
      "unicorn/prefer-await": "off",
      "unicorn/prefer-number-coercion": "off",
      "unicorn/no-duplicate-loops": "off",
      "unicorn/consistent-boolean-name": "off",
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/prefer-direct-iteration": "off",
      "unicorn/no-optional-chaining-on-undeclared-variable": "off",
      "unicorn/prefer-minimal-ternary": "off",
      "unicorn/no-unsafe-string-replacement": "off",
      "unicorn/prefer-iterator-helpers": "off",
      "unicorn/consistent-class-member-order": "off",
      "sonarjs/super-linear-regex": "off",
      "unicorn/consistent-conditional-object-spread": "off",
      "no-useless-assignment": "off",
      "unicorn/no-computed-property-existence-check": "off",
      "unicorn/prefer-https": "off",
      "perfectionist/sort-objects": "off",
      "unicorn/no-unreadable-for-of-expression": "off",
      "sonarjs/void-use": "off",
      "unicorn/no-for-each": "off",
      "unicorn/prefer-early-return": "off",
      "unicorn/prefer-continue": "off",
      "unicorn/consistent-compound-words": "off",
      "sonarjs/prefer-specific-assertions": "off",
    },
  },
];
