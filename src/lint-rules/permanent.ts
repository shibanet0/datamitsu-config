/**
 * Rules that are off on purpose and are not coming back.
 *
 * An entry here is a decision, not a backlog item: the rule is wrong for this stack, or another
 * tool in the stack already owns what it checks. The value is the reason — "why is this off?" has
 * to be answerable from the list itself, because the alternative is what this list replaced: a
 * hundred turn-offs spread across a hundred project configs with nobody left who remembers.
 *
 * Everything that is off only until someone gets round to it belongs in {@link ../temporary}
 * instead.
 *
 * Rules are written in their **ESLint** spelling. `../index` translates to oxlint's shorter
 * prefixes (`@typescript-eslint/` → `typescript/`, `import-x/` → `import/`, `jsx-a11y-x/` →
 * `jsx-a11y/`) and drops whatever oxlint does not know about. Rules that only oxlint has — `oxc/*`
 * — are written as oxlint spells them; ESLint ignores an unknown rule name as long as its severity
 * is `"off"`.
 */
import type { KnownRuleName } from "./rule-names.generated";

export const PERMANENTLY_DISABLED_RULES: Partial<Record<KnownRuleName, string>> = {
  /**
   * Owned by another tool in the stack. Leaving these on means two tools reporting the same
   * finding, and in the formatter's case fighting over the fix.
   */
  "no-duplicate-imports":
    "import-x/no-duplicates owns duplicate imports, and understands type-only imports",
  "no-unused-vars": "unused-imports owns unused bindings, and auto-fixes them",
  "sort-imports": "perfectionist/sort-imports owns import order",
  "sort-keys": "perfectionist/sort-objects owns key order",
  "unicorn/empty-brace-spaces": "prettier / oxfmt own whitespace",
  "unicorn/number-literal-case": "prettier / oxfmt own literal casing",

  /**
   * Fire on the config files `datamitsu setup` writes (`datamitsu.config.js`, `eslint.config.mjs`).
   * They have to stay off globally: a freshly set-up project has to lint clean before the consumer
   * has written a single line of their own code. This is exactly what broke the smoke test once
   * already.
   */
  "no-implicit-globals":
    "generated config assigns onto the global object — goja has no module system",
  "no-undefined": "generated config compares against `undefined`",
  "oxc/no-rest-spread-properties": "generated config spreads the caller's overrides",
  "unicorn/import-style": "generated config picks the import style datamitsu needs",

  /**
   * Type-aware, and unusable as designed: it demands a deeply-readonly type for every parameter of
   * every function, which is a whole-codebase rewrite to satisfy one rule. 270 hits here on its own
   * — more than every other type-aware rule put together.
   */
  "@typescript-eslint/prefer-readonly-parameter-types":
    "every parameter would need a deep readonly type",

  /**
   * `restriction` rules written for an ES5-era target. This stack is modern ESM + TypeScript, so
   * the thing they ban is the thing we want.
   */
  "oxc/no-async-await": "async/await is the baseline, not a hazard",
  "oxc/no-optional-chaining": "optional chaining is the baseline, not a hazard",

  /**
   * Needs project-specific configuration this shared config cannot supply, and reports nonsense
   * without it rather than staying quiet.
   */
  "n/no-missing-import":
    "eslint-plugin-n resolves imports the way Node does; this stack is bundler-resolved, so extensionless paths and `./.datamitsu/*` links read as missing \u{2014} 245 hits, none of them real",

  /**
   * JSDoc tags that restate what TypeScript already says. A `@returns` type in a comment is a
   * second, unchecked copy of the signature — exactly the duplication types exist to remove.
   */
  "jsdoc/require-returns":
    "TypeScript already states the return type; a `@returns` tag restates it and rots separately",
  "jsdoc/require-returns-type":
    "the type is in the signature \u{2014} writing it again in the comment is the thing TS removed",
  "jsdoc/require-throws-type": "same: a thrown type belongs in the code, not in a tag",
  "jsdoc/valid-types":
    "validates JSDoc type syntax, which this codebase does not use for types at all",

  /**
   * Arbitrary size and shape caps. They gate line counts rather than defects, and the number is
   * always wrong for some file — so they get suppressed per-file, which is worse than not having
   * them.
   */
  complexity: "cyclomatic complexity cap",
  "id-length": "identifier length cap",
  "max-classes-per-file": "class count cap",
  "max-depth": "nesting depth cap",
  "max-lines": "file length cap",
  "max-lines-per-function": "function length cap",
  "max-params": "parameter count cap",
  "max-statements": "statement count cap",
  "unicorn/max-nested-calls": "call nesting cap",

  /**
   * Style opinions this codebase has already settled the other way. Keeping them on would mean
   * rewriting working code to satisfy taste, not correctness.
   */
  "arrow-body-style": "both forms are fine",
  "capitalized-comments": "comments are prose, not sentences to be linted",
  "func-names": "anonymous callbacks are fine",
  "func-style": "both declarations and expressions are used deliberately",
  "init-declarations": "declare-then-assign is fine",
  "no-bitwise": "bitwise operators are used deliberately where they appear",
  "no-continue": "`continue` is a guard clause in loop form",
  "no-else-return": "the symmetric branch often reads better",
  "no-eq-null": "`== null` is the idiomatic null-or-undefined check; eqeqeq covers the rest",
  "no-inline-comments": "trailing comments are used deliberately",
  "no-lonely-if": "`else { if }` is sometimes the clearer shape",
  "no-magic-numbers": "forces a named constant for every literal",
  "no-negated-condition": "negated conditions are often the shorter path",
  "no-nested-ternary": "nested ternaries are used deliberately in expression position",
  "no-plusplus": "`++` in a for-loop is not a hazard",
  "no-ternary": "bans ternaries outright",
  "no-underscore-dangle": "`_foo` marks a deliberately unused or private binding",
  "no-void": "`void` is used deliberately to discard a promise",
  "no-warning-comments": "TODO/FIXME are tracked in docs/backlog, not banned",
  "prefer-destructuring": "both forms are fine",
  "prefer-template": "concatenation is fine for two operands",
  "unicorn/filename-case": "filename convention differs per directory in this repo",
  "unicorn/no-array-for-each": "`forEach` is fine",
  "unicorn/no-array-reduce": "`reduce` is fine",
  "unicorn/no-lonely-if": "same as core no-lonely-if",
  "unicorn/no-negated-condition": "same as core no-negated-condition",
  "unicorn/no-nested-ternary": "same as core no-nested-ternary",
  "unicorn/no-null": "`null` is a distinct, meaningful value — especially over the wire",
  "unicorn/prefer-query-selector": "`getElementById` is measurably faster — http://jsben.ch/8tEs3",
  "unicorn/prefer-string-raw": "String.raw obscures more than the escape it removes",
  "unicorn/prefer-ternary": "an if/else is often the clearer shape",
};
