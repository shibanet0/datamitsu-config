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
 *
 * The most recent batch is kept in {@link NEWLY_DISABLED_RULES} and spread in at the top, so a
 * group that has not been triaged yet stays visible instead of dissolving into the alphabet.
 */
import type { KnownRuleName } from "./rule-names.generated";

/**
 * Rules that went off in one batch, and have not been decided one at a time yet.
 *
 * Every one of them started firing the moment oxlint's twelve dormant plugins were switched on. The
 * reason next to each is a _proposal_, not a decision — several of these are probably permanent
 * (`import-x/no-named-export` bans the convention this codebase is written in) and several are
 * probably just work (the whole vitest set is real test-quality debt). Nobody has been through
 * them.
 *
 * They live in their own object so `perfectionist/sort-objects` cannot scatter them through the
 * four hundred entries below, where a batch of forty-five would be invisible. Triage from here
 * first: move an entry down into the main list when it is genuinely deferred work, up into
 * `../permanent` when it is a decision, or delete it and fix the code.
 *
 * Counts are for this repository at the time the plugins were enabled.
 */
const NEWLY_DISABLED_RULES: Partial<Record<KnownRuleName, string>> = {
  "import-x/consistent-type-specifier-style": "9 — autofixable, probably just work",
  "import-x/exports-last":
    "72 — export position is a style opinion; a symbol is exported where it is defined",
  "import-x/first": "2 — probably just work",
  "import-x/group-exports":
    "165 — collecting every export into one statement moves the declaration away from the name",
  "import-x/max-dependencies": "4 — import count cap",
  "import-x/newline-after-import": "1 — prettier / oxfmt own whitespace",
  "import-x/no-named-export":
    "316 — named exports are the convention here; the rule bans them outright in favour of a default",
  "import-x/no-namespace": "2 — `import * as` is how a namespace-shaped module is consumed",
  "import-x/no-nodejs-modules":
    "105 — bans node builtins outright; scripts/ is Node by design. Worth revisiting scoped to src/datamitsu-config, where the goja runtime really does forbid them",
  "import-x/no-relative-parent-imports":
    "145 — `../` is how this repo imports; the alternative is a path alias in every consumer",
  "import-x/no-unassigned-import": "1 — side-effect imports are used deliberately",
  "import-x/prefer-default-export":
    "122 — the opposite convention to the one this codebase uses, and it contradicts import-x/no-named-export, which is also in this list",
  "import-x/unambiguous": "1 — requires module syntax; a `.cjs` file is CommonJS on purpose",
  "n/exports-style": "2 — `module.exports` shape rule; this stack is ESM",
  "n/no-process-env": "13 — `process.env` is how a Node script reads its environment",
  "n/no-sync":
    "38 — synchronous fs calls are the right call in a build script that has nothing to overlap with",
  "n/no-top-level-await":
    "52 — guards `require(esm)` compatibility; top-level await is the baseline for the ESM-only code here",
  "oxc/no-barrel-file":
    "2 — `src/lib/index.ts` and the app entry points are barrels on purpose; that is the published surface",
  "promise/avoid-new": "1 — `new Promise` is the correct primitive when wrapping a callback API",
  "promise/prefer-await-to-then": "44 — mechanical, probably just work",
  /**
   * The test-quality set. Neither tool was running any of it: oxlint had the vitest plugin off, and
   * the ESLint block scopes itself to `tests/**` while the tests live in `__tests__/`. 824 of the
   * 853 hits are in real test files; the other 29 are oxlint applying test rules to `scripts/*.ts`,
   * which needs a file scope rather than a turn-off.
   */
  "vitest/max-expects": "1",
  "vitest/no-conditional-expect": "2",
  "vitest/no-conditional-in-test": "61",
  "vitest/no-hooks": "14",
  "vitest/no-importing-vitest-globals": "31",
  "vitest/padding-around-test-blocks": "1",
  "vitest/prefer-called-once": "8",
  "vitest/prefer-called-with": "7",
  "vitest/prefer-describe-function-title": "26",
  "vitest/prefer-each": "2",
  "vitest/prefer-expect-assertions": "264",
  "vitest/prefer-expect-type-of": "2",
  "vitest/prefer-import-in-mock": "18",
  "vitest/prefer-lowercase-title": "3",
  "vitest/prefer-mock-return-shorthand": "2",
  "vitest/prefer-strict-equal": "37",
  "vitest/prefer-to-be-falsy": "21",
  "vitest/prefer-to-be-truthy": "23",
  "vitest/prefer-to-have-length": "4",
  "vitest/require-hook": "29",
  "vitest/require-mock-type-parameters": "30",
  "vitest/require-test-timeout": "264",
  "vitest/require-to-throw-message": "1",
  "vitest/require-top-level-describe": "2 — both in vitest.setup.ts, which is not a test",
  "vitest/valid-expect": "2",
};

export const TEMPORARILY_DISABLED_RULES: Partial<Record<KnownRuleName, string>> = {
  ...NEWLY_DISABLED_RULES,
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
  "@typescript-eslint/no-duplicate-enum-values": "off",
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
  "@typescript-eslint/no-namespace": "off",
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
  // fsecond
  "fsecond/valid-event-listener": "1 eslint config",
  "guard-for-in": "1 oxlint config",
  // i18next
  "i18next/no-literal-string": "14 eslint configs",
  "import-x/default": "-",
  "import-x/namespace": "off",

  "import-x/no-commonjs": "off",

  "import-x/no-cycle": "off",

  "import-x/no-default-export": "off",

  "import-x/no-duplicates": "off",
  "import-x/no-mutable-exports": "-",
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
  // jsx-a11y-x
  "jsx-a11y-x/alt-text": "2 eslint configs",
  "jsx-a11y-x/anchor-has-content": "2 eslint configs",
  "jsx-a11y-x/anchor-is-valid": "2 eslint configs",
  "jsx-a11y-x/control-has-associated-label": "off",
  "jsx-a11y-x/iframe-has-title": "2 eslint configs",
  "jsx-a11y-x/no-autofocus": "off",
  "jsx-a11y-x/no-noninteractive-element-interactions": "2 eslint configs",
  "jsx-a11y-x/no-noninteractive-tabindex": "2 eslint configs",

  "jsx-a11y-x/tabindex-no-positive": "off",
  "logical-assignment-operators": "1 oxlint config",
  "n/callback-return": "-",

  "n/global-require": "off",

  "n/hashbang": "2 in the repo",
  "n/no-extraneous-import": "-",
  "n/no-path-concat": "off",
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
  "no-useless-catch": "-",
  "no-useless-computed-key": "2 oxlint configs",
  "no-useless-constructor": "1 oxlint config",
  "no-useless-escape": "off",
  "no-useless-rename": "1 oxlint config",
  "no-useless-return": "2 oxlint configs",
  // oxc
  "oxc/branches-sharing-code": "1 oxlint config",
  "oxc/no-map-spread": "3 oxlint configs",
  // playwright
  "playwright/no-networkidle": "1 eslint config",
  "playwright/no-standalone-expect": "3 eslint configs",
  // promise
  "pnpm/json-enforce-catalog":
    "was off in the plugin config; this repo pins several deps outside the catalog on purpose",

  "prefer-exponentiation-operator": "1 oxlint config",
  "prefer-named-capture-group": "off in datamitsu-config, 1 oxlint config",
  "prefer-object-has-own": "1 oxlint config",
  "promise/always-return": "off",
  "promise/catch-or-return": "-",
  "promise/no-nesting": "off",
  "promise/no-promise-in-callback": "off",
  // promise
  "promise/param-names": "1 eslint config",
  "promise/prefer-await-to-callbacks": "-",
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
  "react-perf/jsx-no-jsx-as-prop": "off",
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
  "react/capitalized-calls": "off",
  "react/display-name": "off",
  "react/exhaustive-effect-dependencies": "off",
  "react/forbid-component-props": "off",
  "react/function-component-definition": "-",
  "react/hook-use-state": "off",
  "react/invariant": "off",
  "react/jsx-filename-extension": "-",
  "react/jsx-handler-names": "off",
  // react
  "react/jsx-key": "1 eslint config",
  "react/jsx-max-depth": "off",
  "react/jsx-no-constructed-context-values": "off",
  "react/jsx-no-literals": "off",
  "react/jsx-no-useless-fragment": "off",
  "react/jsx-props-no-spreading": "off",
  "react/memo-dependencies": "off",
  "react/no-array-index-key": "off",
  "react/no-danger": "off",
  "react/no-multi-comp": "off",
  "react/no-unstable-nested-components": "off",
  "react/only-export-components": "-",
  "react/prefer-function-component": "off",
  "react/react-in-jsx-scope": "-",
  "react/rule-suppression": "-",
  "react/self-closing-comp": "off",
  "react/todo": "-",
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
  // Needs type information to do anything: the rule asks for typescript-eslint's type tools and
  // returns an empty visitor when there is no program, so at `error` and without `projectService`
  // it reported nothing — measured on a component with an unused typed prop. Off by name rather
  // than left configured and inert; back on when the svelte block gets type-aware linting.
  "svelte/no-unused-props": "needs a TypeScript program this config does not build",
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
  "unicorn/prefer-at": "off",
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
  "unicorn/prefer-string-replace-all": "-",
  "unicorn/prefer-string-slice": "off",
  // "next/no-img-element":"off",
  "unicorn/prefer-structured-clone": "off",
  "unicorn/prefer-then-catch": "1 eslint config",
  "unicorn/prefer-top-level-await": "5 oxlint configs, 2 eslint configs",
  "unicorn/prefer-type-error": "1 oxlint config",
  "unicorn/prefer-url-href": "1 eslint config",
  "unicorn/require-array-sort-compare": "2 eslint configs",
  "unicorn/require-module-specifiers": "off in datamitsu-config, 1 oxlint config",
  "unicorn/require-post-message-target-origin": "1 oxlint config",
  "unicorn/single-line-block-comment-style": "2 eslint configs",
  "vitest/consistent-test-filename": "-",
  "vitest/prefer-expect-resolves": "off",
  "vitest/prefer-importing-vitest-globals": "off",
  "vitest/prefer-mock-promise-shorthand": "off",
  "vitest/prefer-spy-on": "off",
};
