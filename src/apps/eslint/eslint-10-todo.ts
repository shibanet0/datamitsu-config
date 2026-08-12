import type { TypedFlatConfigItem } from "./types";

/**
 * TODO(eslint-10): rules that first appeared during the ESLint 9 → 10 upgrade (new rules added to
 * `eslint-plugin-unicorn` 73, `eslint-plugin-sonarjs` 4 and `@eslint/js` 10 presets). They are
 * switched off wholesale here so the upgrade stays an upgrade — every one of them still needs to be
 * triaged and either adopted or dropped on purpose.
 *
 * Nothing else belongs in this block: it is not a general-purpose opt-out list, and it must shrink
 * to nothing as the rules get reviewed one by one.
 *
 * Counts below are violations observed in this repository at the time of the upgrade.
 */
export const eslint10Todo = (): TypedFlatConfigItem[] => [
  {
    name: "shibanet0/todo-eslint-10",
    rules: {
      // @eslint/js 10 `recommended` — 1
      // https://eslint.org/docs/latest/rules/no-useless-assignment
      "no-useless-assignment": "off",

      // eslint-plugin-sonarjs 4 `recommended` — 2
      // https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/parameterized-tests.md
      "sonarjs/parameterized-tests": "off",
      // eslint-plugin-sonarjs 4 `recommended` — 3
      // https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/prefer-specific-assertions.md
      "sonarjs/prefer-specific-assertions": "off",
      // eslint-plugin-sonarjs 4 `recommended` — 3
      // https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/super-linear-regex.md
      "sonarjs/super-linear-regex": "off",

      // eslint-plugin-unicorn 73 `recommended` — 10
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-boolean-name.md
      "unicorn/consistent-boolean-name": "off",
      // eslint-plugin-unicorn 73 `recommended` — 5
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-class-member-order.md
      "unicorn/consistent-class-member-order": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-compound-words.md
      "unicorn/consistent-compound-words": "off",
      // eslint-plugin-unicorn 73 `recommended` — 7
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-conditional-object-spread.md
      "unicorn/consistent-conditional-object-spread": "off",
      // eslint-plugin-unicorn 73 `recommended` — 3 (previously masked by oxlint's duplicate
      // suppression, which stopped covering it once the matching oxlint rule was disabled)
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/max-nested-calls.md
      "unicorn/max-nested-calls": "off",
      // eslint-plugin-unicorn 73 `recommended` — 256 (successor to the already-disabled
      // `unicorn/prevent-abbreviations`; auto-fixes 201 of them by renaming identifiers)
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/name-replacements.md
      "unicorn/name-replacements": "off",
      // eslint-plugin-unicorn 73 `recommended` — 3
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-break-in-nested-loop.md
      "unicorn/no-break-in-nested-loop": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-computed-property-existence-check.md
      "unicorn/no-computed-property-existence-check": "off",
      // eslint-plugin-unicorn 73 `recommended` — 5
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-declarations-before-early-exit.md
      "unicorn/no-declarations-before-early-exit": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-duplicate-loops.md
      "unicorn/no-duplicate-loops": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-for-each.md
      "unicorn/no-for-each": "off",
      // eslint-plugin-unicorn 73 `recommended` — 12
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-global-object-property-assignment.md
      "unicorn/no-global-object-property-assignment": "off",
      // eslint-plugin-unicorn 73 `recommended` — 7
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-optional-chaining-on-undeclared-variable.md
      "unicorn/no-optional-chaining-on-undeclared-variable": "off",
      // eslint-plugin-unicorn 73 `recommended` — 2
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-unreadable-for-of-expression.md
      "unicorn/no-unreadable-for-of-expression": "off",
      // eslint-plugin-unicorn 73 `recommended` — 11
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-unsafe-string-replacement.md
      "unicorn/no-unsafe-string-replacement": "off",
      // eslint-plugin-unicorn 73 `recommended` — 54
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-await.md
      "unicorn/prefer-await": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-continue.md
      "unicorn/prefer-continue": "off",
      // eslint-plugin-unicorn 73 `recommended` — 4
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-direct-iteration.md
      "unicorn/prefer-direct-iteration": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-early-return.md
      "unicorn/prefer-early-return": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-https.md
      "unicorn/prefer-https": "off",
      // eslint-plugin-unicorn 73 `recommended` — 1
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-iterator-helpers.md
      "unicorn/prefer-iterator-helpers": "off",
      // eslint-plugin-unicorn 73 `recommended` — 7
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-iterator-to-array.md
      "unicorn/prefer-iterator-to-array": "off",
      // eslint-plugin-unicorn 73 `recommended` — 3
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-minimal-ternary.md
      "unicorn/prefer-minimal-ternary": "off",
      // eslint-plugin-unicorn 73 `recommended` — 4 (previously masked by oxlint's duplicate
      // suppression, which stopped covering it once the matching oxlint rule was disabled)
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-number-coercion.md
      "unicorn/prefer-number-coercion": "off",
      // eslint-plugin-unicorn 73 `recommended` — 4
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-split-limit.md
      "unicorn/prefer-split-limit": "off",
      // eslint-plugin-unicorn 73 `recommended` — 12
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/require-array-sort-compare.md
      "unicorn/require-array-sort-compare": "off",
      // eslint-plugin-unicorn 73 `recommended` — 2
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/single-line-block-comment-style.md
      "unicorn/single-line-block-comment-style": "off",
    },
  },
];
