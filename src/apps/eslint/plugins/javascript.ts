import type { TypedFlatConfigItem } from "../types";

export const javascript = async (): Promise<TypedFlatConfigItem[]> => {
  // `globals` v17 is CommonJS, so `await import("globals")` yields the module namespace, whose only
  // keys are `default` and `module.exports`. Reading `globals.browser` off that namespace gave
  // `undefined`, and the three spreads below expanded to nothing — this block installed the three
  // literal globals under it and no others.
  //
  // It has been latent rather than visible: `s0/compat` contributes 1128 globals and `s0/n` another
  // 134, so ~1240 arrive by accident. A consumer who turns either plugin off — both are supported
  // toggles — drops to three, and every globals-consuming rule starts reporting nonsense the moment
  // one comes back off `temporary.ts`.
  const [plugin, { default: globals }] = await Promise.all([
    import("@eslint/js"),
    import("globals"),
  ]);

  return [
    { ...plugin.default.configs.recommended, name: "s0/js" },
    {
      languageOptions: {
        ecmaVersion: "latest",
        globals: {
          ...globals.browser,
          ...globals.es2026,
          ...globals.node,
          document: "readonly",
          navigator: "readonly",
          window: "readonly",
        },
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          ecmaVersion: "latest",
          sourceType: "module",
        },
        sourceType: "module",
      },
      /**
       * A suppression that no longer suppresses anything is an error, not a shrug.
       *
       * `reportUnusedDisableDirectives` defaults to `"warn"`, and datamitsu runs eslint with
       * `--quiet` — so the default reported nothing and failed nothing. Setting it to `false`, as
       * this block used to, picked the wrong side of that: stale `// eslint-disable` comments
       * accumulate invisibly, and the one left behind on a rule that later comes back off
       * `temporary.ts` silently swallows it. This is also the one warn-severity thing in the config
       * that `raiseWarningsToErrors` cannot reach, because it lives in `linterOptions` rather than
       * in `rules`.
       *
       * `reportUnusedInlineConfigs` is the sibling case — an inline `/* eslint x: "error" *\/` that
       * changes nothing because the config already says exactly that. Off by default.
       *
       * `noInlineConfig` stays unset. A precise, reviewed suppression with a reason next to it is
       * fine; this repository needs a few itself for goja.
       */
      linterOptions: {
        /**
         * Off for the duration of the batch park, and coming back.
         *
         * The argument above is still the right one — it is the reason this is `"off"` with a note
         * rather than deleted. But the two states fight: "unused" means "names a rule this config
         * has off", so every rule moved into `temporary.ts` turns every existing `eslint-disable`
         * for it into an error. The check is most valuable when the rule set is settled and most
         * destructive while it is being settled, which is now.
         *
         * Turn it back on when the backlog stops growing — before per-rule triage starts, not
         * after, since a stale directive left on a rule coming back off `temporary.ts` is exactly
         * what it catches. `--fix-type` in `tools.ts` stays either way: it is what stops `dm fix`
         * from silently deleting these comments the moment this is `"error"` again.
         */
        reportUnusedDisableDirectives: "off",
        reportUnusedInlineConfigs: "error",
      },
      name: "s0/js/setup",
    },
    {
      name: "s0/js/disables",
      rules: { "no-empty": "off", "no-restricted-imports": "off", "no-undef": "off" },
    },
    {
      name: "s0/js/rules",
      rules: {
        /**
         * `{ null: "ignore" }` is what makes `no-eq-null` a decision rather than a hole.
         *
         * That rule sits in `permanent.ts` saying "`== null` is the idiomatic null-or-undefined
         * check; eqeqeq covers the rest" — and eqeqeq was itself off, so nothing covered the rest.
         * The option is the other half of the same sentence: `==` is an error everywhere except
         * against `null`, which is the one place it means something.
         */
        eqeqeq: ["error", "always", { null: "ignore" }],
      },
    },
  ];
};
