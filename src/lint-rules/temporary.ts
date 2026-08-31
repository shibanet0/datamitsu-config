/**
 * The migration backlog: rules that _should_ be on, and are off only until the code is ready for
 * them.
 *
 * This list exists so that adopting datamitsu-config does not start with a wall of pre-existing
 * violations. Every entry is a promise to come back — shrinking this list is the work, and a
 * project that wants the real bar today can opt out with `defineConfig(pkg, config, {
 * temporaryRules: false })`.
 *
 * The initial contents are a sweep of every oxlint and ESLint config across every datamitsu-managed
 * repository: whatever any project had already turned off locally is turned off here instead, so
 * the suppression lives in one place that can be triaged rather than in a hundred that cannot. The
 * value records where each rule was found — replace it with a real reason (or delete the entry and
 * fix the code) as you work through them.
 *
 * A rule that turns out to be permanently unwanted moves to {@link ../permanent}. Same spelling
 * rules as there: ESLint names, translated for oxlint by `../index`.
 */
import type { KnownRuleName } from "./rule-names.generated";

export const TEMPORARILY_DISABLED_RULES: Partial<Record<KnownRuleName, string>> = {
  "@eslint-react/dom-no-dangerously-set-innerhtml": "-",
  // @eslint-react
  "@eslint-react/jsx-no-key-after-spread": "1 eslint config",
  "@eslint-react/jsx-no-leaked-semicolon": "-",
  "@eslint-react/naming-convention-context-name": "-",
  "@eslint-react/naming-convention-ref-name": "-",
  "@eslint-react/no-array-index-key": "-",
  "@eslint-react/no-clone-element": "-",
  "@eslint-react/no-context-provider": "-",
  "@eslint-react/no-forward-ref": "-",
  "@eslint-react/no-missing-key": "1 eslint config",
  "@eslint-react/no-unnecessary-use-prefix": "-",
  "@eslint-react/no-use-context": "-",
  "@eslint-react/use-state": "-",
  "@eslint-react/web-api-no-leaked-event-listener": "-",
  // @typescript-eslint
  "@typescript-eslint/array-type": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/await-thenable":
    "type-aware — 1 in src/, same Promise.all(mixed array) pattern",
  "@typescript-eslint/ban-ts-comment": "1 oxlint config",
  "@typescript-eslint/ban-types":
    "1 oxlint config — gone from typescript-eslint, still an oxlint rule",
  "@typescript-eslint/consistent-generic-constructors": "1 oxlint config",
  "@typescript-eslint/consistent-indexed-object-style": "1 oxlint config",
  "@typescript-eslint/consistent-return": "type-aware — 4 in src/",
  "@typescript-eslint/consistent-type-definitions": "1 oxlint config",
  "@typescript-eslint/consistent-type-exports":
    "type-aware — would rewrite every re-export to `export type`",
  "@typescript-eslint/consistent-type-imports": "off in datamitsu-config",
  "@typescript-eslint/dot-notation": "type-aware — 15 in src/",
  "@typescript-eslint/explicit-function-return-type": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/explicit-member-accessibility": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/explicit-module-boundary-types": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/method-signature-style": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/no-base-to-string": "type-aware — 1 in src/",
  "@typescript-eslint/no-confusing-void-expression": "type-aware — 2 in the repo",
  "@typescript-eslint/no-deprecated":
    "type-aware — 6 in the repo, and the most worth turning back on first",
  "@typescript-eslint/no-duplicate-type-constituents":
    "type-aware — duplicates in a union are usually generated, not written",
  "@typescript-eslint/no-dynamic-delete": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/no-empty-interface": "2 oxlint configs",
  "@typescript-eslint/no-empty-object-type": "1 oxlint config",
  "@typescript-eslint/no-explicit-any": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/no-extraneous-class": "3 oxlint configs",
  "@typescript-eslint/no-floating-promises":
    "type-aware — 4 in src/, all on the deliberately mixed array fed to Promise.all in apps/eslint/index.ts",

  "@typescript-eslint/no-import-type-side-effects": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/no-inferrable-types": "1 oxlint config",

  "@typescript-eslint/no-invalid-void-type": "1 oxlint config",
  "@typescript-eslint/no-misused-promises": "type-aware — 4 in the repo",
  "@typescript-eslint/no-misused-spread":
    "type-aware — spreading a string or a class into an array/object is usually a mistake, but not always",
  "@typescript-eslint/no-non-null-assertion": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/no-redundant-type-constituents":
    "type-aware — a redundant constituent is often deliberate documentation",
  "@typescript-eslint/no-require-imports": "1 oxlint config",
  "@typescript-eslint/no-unnecessary-template-expression": "type-aware — 1 in src/",
  "@typescript-eslint/no-unnecessary-type-arguments": "type-aware — 1 in src/",
  "@typescript-eslint/no-unnecessary-type-assertion": "type-aware — 9 in src/",
  "@typescript-eslint/no-unnecessary-type-constraint": "1 oxlint config",
  "@typescript-eslint/no-unnecessary-type-conversion":
    "type-aware — an explicit conversion is sometimes the clearer intent",
  "@typescript-eslint/no-unnecessary-type-parameters":
    "type-aware — a type parameter used once is often still the clearer signature",
  "@typescript-eslint/no-unsafe-argument": "type-aware — 35 in src/; tied to no-explicit-any",
  "@typescript-eslint/no-unsafe-assignment": "type-aware — 94 in src/; tied to no-explicit-any",
  "@typescript-eslint/no-unsafe-call": "type-aware — 118 in src/; tied to no-explicit-any",
  "@typescript-eslint/no-unsafe-member-access":
    "type-aware — 238 in src/; the whole no-unsafe-* family goes away with @typescript-eslint/no-explicit-any",
  "@typescript-eslint/no-unsafe-return": "type-aware — 13 in src/; tied to no-explicit-any",
  "@typescript-eslint/no-unsafe-type-assertion": "type-aware — 87 in src/; tied to no-explicit-any",
  "@typescript-eslint/no-useless-empty-export":
    "fires on files whose only real export is a compile-time assertion, so `export {}` is what makes them a module",
  "@typescript-eslint/no-var-requires": "1 oxlint config",
  "@typescript-eslint/non-nullable-type-assertion-style": "type-aware — 2 in src/",
  "@typescript-eslint/only-throw-error": "type-aware — rethrowing a caught `unknown` trips it",
  "@typescript-eslint/prefer-nullish-coalescing": "type-aware — 42 in src/",
  "@typescript-eslint/prefer-promise-reject-errors": "type-aware — 2 in src/",
  "@typescript-eslint/prefer-readonly": "type-aware — 5 in src/",
  "@typescript-eslint/prefer-regexp-exec": "type-aware — 4 in the repo",
  "@typescript-eslint/prefer-string-starts-ends-with": "type-aware — 1 in the repo",
  "@typescript-eslint/promise-function-async": "type-aware — 98 in src/",
  "@typescript-eslint/require-array-sort-compare": "type-aware — 3 in src/",
  "@typescript-eslint/require-await": "type-aware — 7 in src/",
  "@typescript-eslint/restrict-template-expressions":
    "type-aware — bans interpolating anything but a string",
  "@typescript-eslint/return-await":
    "type-aware — `return await` inside try/catch is meaningful, outside it is noise",
  "@typescript-eslint/strict-boolean-expressions": "type-aware — 51 in src/",
  "@typescript-eslint/strict-void-return":
    "type-aware — 13 in the repo, mostly tsdown config callbacks",
  "@typescript-eslint/switch-exhaustiveness-check":
    "type-aware — wants a case per union member plus a default",
  "@typescript-eslint/triple-slash-reference": "off in datamitsu-config, 1 oxlint config",
  "@typescript-eslint/use-unknown-in-catch-callback-variable": "type-aware — 1 in the repo",
  // core
  "array-callback-return": "1 oxlint config",
  "class-methods-use-this": "off in datamitsu-config, 1 oxlint config",
  "compat/compat":
    "needs a browserslist; with none declared it falls back to a target including Opera Mini, where `fetch` and `Promise.all` read as unsupported — 23 hits here, all noise, but a browser project with real targets wants this on",
  curly: "2 oxlint configs",
  "default-case": "1 oxlint config",
  "default-param-last": "1 oxlint config",
  "depend/ban-dependencies":
    "opinions about dependency choice \u{2014} execa and fast-glob are deliberate \u{2014} 18 in the repo",
  "e18e/ban-dependencies": "-",
  "e18e/prefer-array-at": "-",
  "e18e/prefer-array-from-map": "-",
  "e18e/prefer-array-some": "-",
  "e18e/prefer-array-to-reversed": "-",
  "e18e/prefer-array-to-sorted": "-",
  "e18e/prefer-object-has-own": "-",
  "e18e/prefer-spread-syntax": "-",
  "e18e/prefer-static-regex": "-",
  "e18e/prefer-timer-args": "-",
  eqeqeq: "off in datamitsu-config, 1 oxlint config",
  // fsecond
  "fsecond/valid-event-listener": "1 eslint config",
  "guard-for-in": "1 oxlint config",
  // i18next
  "i18next/no-literal-string": "14 eslint configs",
  "import-x/no-duplicates": "-",
  "import-x/no-named-as-default": "-",
  // import-x
  "import-x/no-named-as-default-member": "1 eslint config",
  // newly enabled plugins
  "jsdoc/check-alignment": "9 in the repo",
  "jsdoc/check-param-names": "-",
  "jsdoc/check-tag-names": "4 in the repo",

  "jsdoc/check-types": "1 in the repo",

  "jsdoc/empty-tags": "17 in the repo",

  "jsdoc/escape-inline-tags": "5 in the repo",

  "jsdoc/multiline-blocks": "3 in the repo",
  "jsdoc/no-defaults": "-",
  "jsdoc/no-undefined-types": "1 in the repo",
  "jsdoc/reject-any-type": "1 in the repo",

  // jsdoc
  "jsdoc/require-jsdoc": "2 eslint configs",
  "jsdoc/require-param": "2 eslint configs",
  "jsdoc/require-param-description": "2 eslint configs",
  "jsdoc/require-param-type": "2 eslint configs",
  "jsdoc/require-returns-check": "-",
  "jsdoc/require-returns-description": "1 in the repo",

  "jsdoc/tag-lines": "80 in the repo",
  "json-schema-validator/no-invalid":
    "3 in the repo \u{2014} the bundled schema uses a draft where exclusiveMinimum is a number, not a boolean",

  // jsx-a11y-x
  "jsx-a11y-x/alt-text": "2 eslint configs",
  "jsx-a11y-x/anchor-has-content": "2 eslint configs",

  "jsx-a11y-x/anchor-is-valid": "2 eslint configs",

  "jsx-a11y-x/iframe-has-title": "2 eslint configs",

  "jsx-a11y-x/no-noninteractive-element-interactions": "2 eslint configs",
  "jsx-a11y-x/no-noninteractive-tabindex": "2 eslint configs",
  "logical-assignment-operators": "1 oxlint config",
  "n/hashbang": "2 in the repo",
  "n/no-extraneous-import": "-",
  "n/no-process-exit":
    "a CLI exits; the unicorn twin of this is already parked \u{2014} 42 in the repo",
  "n/no-unpublished-import": "-",
  "n/no-unsupported-features/node-builtins":
    "flags `import.meta.dirname` against a Node floor lower than the one this stack runs \u{2014} 31 in the repo",
  "new-cap": "5 oxlint configs",
  "no-alert": "1 oxlint config",

  "no-await-in-loop": "off in datamitsu-config, 7 oxlint configs",

  "no-console": "off in datamitsu-config, 1 oxlint config",
  "no-empty": "1 oxlint config",
  "no-empty-function": "off in datamitsu-config, 1 oxlint config",

  "no-empty-pattern": "1 oxlint config, 1 eslint config",

  "no-extra-boolean-cast": "1 oxlint config",
  "no-implicit-coercion": "2 oxlint configs",
  "no-irregular-whitespace": "3 eslint configs",
  "no-new": "6 oxlint configs",
  "no-promise-executor-return": "2 oxlint configs",

  "no-redeclare":
    "oxlint's core rule flags TS declaration merging (`const X` + `type X`); @typescript-eslint/no-redeclare ignores that by default",
  "no-restricted-imports": "1 eslint config",
  "no-shadow": "7 oxlint configs",
  "no-template-curly-in-string": "off in datamitsu-config, 1 oxlint config",
  "no-unneeded-ternary": "1 oxlint config",
  "no-unsafe-optional-chaining": "1 oxlint config",
  "no-unsanitized/method": "-",
  "no-unsanitized/property": "-",
  "no-unused-expressions": "2 oxlint configs",
  "no-use-before-define": "off in datamitsu-config, 1 oxlint config",
  "no-use-extend-native/no-use-extend-native": "-",
  "no-useless-assignment": "1 eslint config",
  "no-useless-computed-key": "2 oxlint configs",
  "no-useless-constructor": "1 oxlint config",

  "no-useless-rename": "1 oxlint config",
  "no-useless-return": "2 oxlint configs",
  // oxc
  "oxc/branches-sharing-code": "1 oxlint config",
  "oxc/no-map-spread": "3 oxlint configs",
  // playwright
  "playwright/no-networkidle": "1 eslint config",
  "playwright/no-standalone-expect": "3 eslint configs",
  "prefer-exponentiation-operator": "1 oxlint config",
  "prefer-named-capture-group": "off in datamitsu-config, 1 oxlint config",
  "prefer-object-has-own": "1 oxlint config",
  // promise
  "promise/param-names": "1 eslint config",
  radix: "1 oxlint config",
  // react-hooks
  "react-hooks/exhaustive-deps": "1 eslint config",
  "react-hooks/immutability": "2 eslint configs",
  "react-hooks/preserve-manual-memoization": "1 eslint config",
  "react-hooks/purity": "2 eslint configs",
  "react-hooks/refs": "2 eslint configs",
  "react-hooks/rules-of-hooks": "1 eslint config",
  "react-hooks/set-state-in-effect": "2 eslint configs",
  "react-hooks/set-state-in-render": "1 eslint config",
  "react-hooks/unsupported-syntax": "1 eslint config",
  "react-hooks/use-memo": "1 eslint config",
  // react-perf (oxlint only — eslint-plugin-react-perf is not shipped by this config)
  "react-perf/jsx-no-new-array-as-prop": "5 eslint configs",

  "react-perf/jsx-no-new-function-as-prop": "7 eslint configs",
  "react-perf/jsx-no-new-object-as-prop": "5 eslint configs",
  // react-prefer-function-component
  "react-prefer-function-component/react-prefer-function-component": "1 eslint config",
  // react-refresh
  "react-refresh/only-export-components": "2 eslint configs",
  "react-you-might-not-need-an-effect/no-adjust-state-on-prop-change": "-",
  "react-you-might-not-need-an-effect/no-chain-state-updates": "-",
  "react-you-might-not-need-an-effect/no-derived-state": "-",
  "react-you-might-not-need-an-effect/no-event-handler": "-",
  "react-you-might-not-need-an-effect/no-external-store-subscription": "-",
  "react-you-might-not-need-an-effect/no-initialize-state": "-",
  "react-you-might-not-need-an-effect/no-pass-data-to-parent": "-",
  "react-you-might-not-need-an-effect/no-pass-live-state-to-parent": "-",
  // react
  "react/jsx-key": "1 eslint config",
  "regexp/no-dupe-characters-character-class": "-",
  "regexp/no-obscure-range": "-",
  "regexp/no-super-linear-backtracking": "2 in the repo",
  "regexp/no-unused-capturing-group": "2 in the repo",
  "regexp/no-useless-assertions": "1 in the repo",
  "regexp/no-useless-escape": "-",
  "regexp/no-useless-flag": "-",
  "regexp/optimal-quantifier-concatenation": "1 in the repo",
  "regexp/prefer-w": "2 in the repo",
  "regexp/strict": "-",
  "regexp/use-ignore-case": "-",
  "require-await": "off in datamitsu-config, 1 oxlint config",
  "require-unicode-regexp": "off in datamitsu-config, 1 oxlint config",
  // security
  "security/detect-child-process": "1 eslint config",
  "security/detect-non-literal-fs-filename": "1 eslint config",
  "security/detect-non-literal-regexp": "1 eslint config",
  "security/detect-object-injection": "1 eslint config",
  "security/detect-unsafe-regex": "1 eslint config",
  // sonarjs
  "sonarjs/no-clear-text-protocols": "2 eslint configs",
  "sonarjs/no-fixed-wait-in-tests": "1 eslint config",
  "sonarjs/no-floating-point-equality": "1 eslint config",
  "sonarjs/no-hardcoded-ip": "6 eslint configs",
  "sonarjs/no-hardcoded-passwords": "3 eslint configs",
  "sonarjs/no-redundant-jump": "2 eslint configs",
  "sonarjs/no-redundant-optional": "1 eslint config",
  "sonarjs/no-trivial-assertions": "1 eslint config",
  "sonarjs/no-unused-vars": "3 eslint configs",
  "sonarjs/parameterized-tests": "2 eslint configs",
  "sonarjs/prefer-specific-assertions": "2 eslint configs",
  "sonarjs/super-linear-regex": "2 eslint configs",
  "sonarjs/updated-loop-counter": "1 eslint config",
  "sonarjs/void-use": "3 eslint configs",
  "turbo/no-undeclared-env-vars": "7 in the repo",
  // unicorn
  "unicorn/better-dom-traversing": "1 eslint config",
  "unicorn/catch-error-name": "1 oxlint config",
  "unicorn/class-reference-in-static-methods": "1 eslint config",
  "unicorn/consistent-boolean-name": "2 eslint configs",
  "unicorn/consistent-class-member-order": "1 eslint config",
  "unicorn/consistent-compound-words": "1 eslint config",
  "unicorn/consistent-conditional-object-spread": "2 eslint configs",
  "unicorn/consistent-function-scoping": "3 oxlint configs",
  "unicorn/consistent-optional-chaining": "1 eslint config",
  "unicorn/custom-error-definition": "1 oxlint config",
  "unicorn/default-export-style": "1 eslint config",
  "unicorn/explicit-length-check": "1 oxlint config",
  "unicorn/logical-assignment-operators": "1 eslint config",
  "unicorn/name-replacements": "2 eslint configs",
  "unicorn/no-abusive-eslint-disable": "off in datamitsu-config, 1 oxlint config",
  "unicorn/no-array-callback-reference": "1 oxlint config, 2 eslint configs",
  "unicorn/no-array-from-fill": "1 eslint config",
  "unicorn/no-array-reverse": "1 oxlint config",
  "unicorn/no-array-sort": "off in datamitsu-config",
  "unicorn/no-await-expression-member": "1 oxlint config, 1 eslint config",
  "unicorn/no-break-in-nested-loop": "1 eslint config",
  "unicorn/no-computed-property-existence-check": "1 eslint config",
  "unicorn/no-declarations-before-early-exit": "2 eslint configs",
  "unicorn/no-duplicate-if-branches": "1 eslint config",
  "unicorn/no-duplicate-loops": "1 eslint config",
  "unicorn/no-empty-file": "1 oxlint config",
  "unicorn/no-error-property-assignment": "1 eslint config",
  "unicorn/no-for-each": "2 eslint configs",
  "unicorn/no-global-object-property-assignment": "2 eslint configs",
  "unicorn/no-immediate-mutation": "3 oxlint configs",
  "unicorn/no-incorrect-query-selector": "1 eslint config",
  "unicorn/no-incorrect-template-string-interpolation": "1 eslint config",
  "unicorn/no-keyword-prefix": "1 eslint config",
  "unicorn/no-nonstandard-builtin-properties": "1 eslint config",
  "unicorn/no-object-as-default-parameter": "off in datamitsu-config",
  "unicorn/no-optional-chaining-on-undeclared-variable": "1 eslint config",
  "unicorn/no-process-exit": "off in datamitsu-config, 1 oxlint config",
  "unicorn/no-return-array-push": "2 eslint configs",
  "unicorn/no-single-promise-in-promise-methods": "1 oxlint config",
  "unicorn/no-this-outside-of-class": "1 eslint config",
  "unicorn/no-top-level-assignment-in-function": "3 eslint configs",
  "unicorn/no-top-level-side-effects": "2 eslint configs",
  "unicorn/no-typeof-undefined": "2 oxlint configs",
  "unicorn/no-unnecessary-global-this": "1 eslint config",
  "unicorn/no-unreadable-for-of-expression": "2 eslint configs",
  "unicorn/no-unsafe-string-replacement": "2 eslint configs",
  "unicorn/no-unused-array-method-return": "1 eslint config",
  "unicorn/no-useless-collection-argument": "2 oxlint configs",
  "unicorn/no-useless-error-capture-stack-trace": "1 oxlint config",
  "unicorn/no-useless-undefined": "1 oxlint config, 3 eslint configs",
  "unicorn/operator-assignment": "1 eslint config",
  "unicorn/prefer-array-flat-map": "1 oxlint config",
  "unicorn/prefer-array-from-map": "1 eslint config",
  "unicorn/prefer-array-last-methods": "1 eslint config",
  "unicorn/prefer-array-some": "2 oxlint configs",
  "unicorn/prefer-await": "3 eslint configs",
  "unicorn/prefer-classlist-toggle": "1 oxlint config",
  "unicorn/prefer-code-point": "1 oxlint config",
  "unicorn/prefer-continue": "1 eslint config",
  "unicorn/prefer-default-parameters": "2 oxlint configs, 2 eslint configs",
  "unicorn/prefer-direct-iteration": "1 eslint config",
  "unicorn/prefer-dom-node-append": "1 oxlint config",
  "unicorn/prefer-dom-node-remove": "1 oxlint config",
  "unicorn/prefer-dom-node-replace-children": "1 eslint config",
  "unicorn/prefer-early-return": "2 eslint configs",
  "unicorn/prefer-else-if": "1 eslint config",
  "unicorn/prefer-global-this": "2 oxlint configs",
  "unicorn/prefer-hoisting-branch-code": "1 eslint config",
  "unicorn/prefer-https": "2 eslint configs",
  "unicorn/prefer-import-meta-properties": "2 oxlint configs",
  "unicorn/prefer-includes-over-repeated-comparisons": "1 eslint config",
  "unicorn/prefer-iterator-helpers": "off in datamitsu-config's own eslint.config.mjs",
  "unicorn/prefer-iterator-to-array": "1 eslint config",
  "unicorn/prefer-location-assign": "1 eslint config",
  "unicorn/prefer-math-trunc": "2 oxlint configs",
  "unicorn/prefer-minimal-ternary": "2 eslint configs",
  "unicorn/prefer-module": "off in datamitsu-config, 1 oxlint config",
  "unicorn/prefer-native-coercion-functions": "1 oxlint config",
  "unicorn/prefer-number-coercion": "off in datamitsu-config, 1 oxlint config, 1 eslint config",
  "unicorn/prefer-number-is-safe-integer": "1 eslint config",
  "unicorn/prefer-number-properties": "off in datamitsu-config, 1 oxlint config",
  "unicorn/prefer-observer-apis": "1 eslint config",
  "unicorn/prefer-optional-catch-binding": "1 oxlint config",
  "unicorn/prefer-promise-with-resolvers": "1 eslint config",
  "unicorn/prefer-response-static-json": "1 oxlint config, 1 eslint config",
  "unicorn/prefer-scoped-selector": "1 eslint config",
  "unicorn/prefer-set-has": "1 oxlint config",
  "unicorn/prefer-set-methods": "1 eslint config",
  "unicorn/prefer-simple-condition-first": "2 eslint configs",
  "unicorn/prefer-single-call": "off in datamitsu-config, 1 oxlint config",
  "unicorn/prefer-split-limit": "2 eslint configs",
  "unicorn/prefer-spread": "2 oxlint configs",
  "unicorn/prefer-then-catch": "1 eslint config",
  "unicorn/prefer-top-level-await": "5 oxlint configs, 2 eslint configs",
  "unicorn/prefer-type-error": "1 oxlint config",
  "unicorn/prefer-url-href": "1 eslint config",
  "unicorn/require-array-sort-compare": "2 eslint configs",
  "unicorn/require-module-specifiers": "off in datamitsu-config, 1 oxlint config",
  "unicorn/require-post-message-target-origin": "1 oxlint config",
  "unicorn/single-line-block-comment-style": "2 eslint configs",
  "unused-imports/no-unused-vars": "-",
};
