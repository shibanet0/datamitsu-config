import type { Oxlintrc } from "./schema";

import { GLOB_EXCLUDE, GLOB_TESTS_OXLINT, toOxlintIgnorePatterns } from "../../globs/globs";
import { disabledRulesForOxlint } from "../../lint-rules";
import { OXLINT_KNOWN_RULES } from "../../lint-rules/oxlint-known-rules.generated";
import { OXLINT_PLUGINS } from "./plugins.generated";

/**
 * Every `vitest/*` rule, off — for use outside test files.
 *
 * Oxlint's vitest plugin has no file scope of its own: enable it and its rules apply to the whole
 * project, so `scripts/*.ts` gets told to import globals from vitest and to add assertions to
 * functions that are not tests. `src/lint-rules/temporary` records 29 findings of exactly that
 * shape, with the note that they need a file scope rather than a turn-off. This is the scope.
 *
 * The ESLint half has always had it — its vitest block is scoped to `GLOB_TESTS` — so this is the
 * two tools agreeing rather than a new opinion.
 *
 * Generated from the pinned build's rule list rather than typed out, so a vitest rule added
 * upstream is scoped on the bump that introduces it instead of leaking into application code until
 * somebody notices.
 */
const vitestRulesOff = Object.fromEntries(
  OXLINT_KNOWN_RULES.filter((rule) => rule.startsWith("vitest/")).map((rule) => [rule, "off"]),
) as NonNullable<Oxlintrc["rules"]>;

export type { Oxlintrc } from "./schema";

/**
 * The part of a `package.json` this config reads.
 *
 * Deliberately narrower than type-fest's `PackageJson`, which is what the ESLint half takes: a
 * `with { type: "json" }` import hands TypeScript the literal shape of the consumer's own manifest,
 * and the wide type does not always accept it — `exports` and `bin` are the usual casualties. Every
 * real manifest satisfies this one, and it says exactly what is looked at.
 */
export interface OxlintPackageJson {
  dependencies?: Partial<Record<string, string>> | undefined;
  devDependencies?: Partial<Record<string, string>> | undefined;
  optionalDependencies?: Partial<Record<string, string>> | undefined;
  peerDependencies?: Partial<Record<string, string>> | undefined;
}

/**
 * The dependency set that means "this project renders React".
 *
 * Named packages rather than a `react-` prefix test, for the reason the ESLint half records:
 * `startsWith("react-")` is true of `react-docgen` and `react-scripts`, so a build-time dependency
 * would switch on the whole React rule set for a project that renders nothing. `next` is here
 * because a Next.js project has React whether or not it depends on it directly.
 */
const REACT_DEPENDENCIES = ["@types/react", "next", "react", "react-dom"];

/**
 * Plugins that only make sense when the project depends on the framework they lint.
 *
 * ESLint has gated its half on `package.json` since it was written. oxlint's could not: a JSON
 * config cannot read a manifest, so `nextjs`, `react`, `vue` and the rest ran in every project
 * regardless of shape. That is the gap moving oxlint to a config module was for, and this is it
 * being closed — until now a package with no Next.js anywhere in its tree still failed on
 * `next/no-img-element` for an `<img>` in a plain React component.
 *
 * Only framework plugins are listed. `eslint`, `import`, `jsdoc`, `node`, `oxc`, `promise`,
 * `typescript` and `unicorn` apply to any JavaScript and stay on unconditionally.
 *
 * Dropping a plugin does not require dropping its rules from the shared list: oxlint accepts a rule
 * name belonging to a plugin that is not enabled, as long as the severity is `"off"`. It is only an
 * unknown _plugin_ name that fails the config parse — `next/*` rather than `nextjs/*`, say.
 */
const CONDITIONAL_PLUGIN_DEPENDENCIES: Partial<
  Record<(typeof OXLINT_PLUGINS)[number], readonly string[]>
> = {
  "jsx-a11y": REACT_DEPENDENCIES,
  nextjs: ["next"],
  react: REACT_DEPENDENCIES,
  "react-perf": REACT_DEPENDENCIES,
  vitest: ["vitest"],
  vue: ["nuxt", "vue"],
};

/**
 * The plugin list for a given project, or every plugin when there is no manifest to consult.
 *
 * No manifest means no regression: a consumer whose `oxlint.config.mts` predates the parameter
 * keeps the behavior it had, rather than silently losing a framework's rules.
 */
function oxlintPlugins(packageJSON?: OxlintPackageJson): NonNullable<Oxlintrc["plugins"]> {
  if (!packageJSON) {
    return [...OXLINT_PLUGINS];
  }

  const dependencies = {
    ...packageJSON.dependencies,
    ...packageJSON.devDependencies,
    ...packageJSON.peerDependencies,
    ...packageJSON.optionalDependencies,
  };

  return OXLINT_PLUGINS.filter((plugin) => {
    const required = CONDITIONAL_PLUGIN_DEPENDENCIES[plugin];

    return !required || required.some((name) => Object.hasOwn(dependencies, name));
  });
}

/**
 * Rules datamitsu-config turns _on_ beyond what the categories already enable.
 *
 * Everything that gets turned _off_ lives in `src/lint-rules` instead, shared with ESLint — see
 * {@link oxlintConfig}.
 */
const enabled: Oxlintrc["rules"] = {
  /**
   * The same options ESLint gets, because the shared list carries severity and not options.
   *
   * `src/lint-rules` only ever turns rules _off_, so a rule both tools enable by default runs with
   * each tool's own defaults. Here that mattered: `no-eq-null` is permanently off on the grounds
   * that `== null` is the idiomatic check and `eqeqeq` covers everything else — which is only true
   * with `{ null: "ignore" }`, and oxlint's categories enable `eqeqeq` without it.
   */
  eqeqeq: ["error", "always", { null: "ignore" }],
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
 *
 * No `$schema`: this is consumed as a TypeScript module, where the `Oxlintrc` type does the job a
 * JSON schema reference used to.
 */
export const oxlintConfig: Oxlintrc = {
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    restriction: "error",
    style: "error",
    suspicious: "error",
  },
  // The same exclusions ESLint gets through `globalIgnores`, translated to oxlint's gitignore-style
  // matching. It was empty, which `dm lint` hides — the runner passes an explicit file list — and an
  // editor does not: the oxlint LSP finds the config by itself and would lint `dist/` and
  // `generated/` with it.
  ignorePatterns: toOxlintIgnorePatterns(GLOB_EXCLUDE),
  // Type-aware linting, run by `oxlint-tsgolint` against the project's tsconfig. It is what makes
  // rules like `no-floating-promises` possible at all — they cannot be decided from syntax alone.
  // Cheap enough to leave on: the engine is Go, not the TypeScript compiler's checker.
  options: {
    // The oxlint half of `reportUnusedDisableDirectives`, off for the same reason and on the same
    // schedule as the ESLint half — see `plugins/javascript.ts`. `"allow"` rather than a deleted
    // key so the decision stays visible and comes back as an edit rather than a rediscovery.
    //
    // When it returns: `"error"`, not the bare CLI flag, which reports at warn and is therefore
    // ignored by oxlint's own exit code. Root-config only either way.
    reportUnusedDisableDirectives: "allow",
    // Each tool judges its own directives, and only its own.
    //
    // oxlint honours `eslint-disable` comments by default, which sounds accommodating and is not:
    // it also means oxlint decides whether an *ESLint* suppression is unused, from a rule universe
    // that does not contain most ESLint rules. A `/* eslint-disable */` covering perfectionist
    // findings in a generated file is invisible to oxlint, so oxlint calls it dead and fails the
    // build over a directive that is doing exactly its job.
    //
    // Turning it off makes ownership explicit: `eslint-disable` is for ESLint, `oxlint-disable` is
    // for oxlint, and a line that genuinely needs both says so twice. That case is rare by
    // construction — eslint-plugin-oxlint turns off every ESLint rule oxlint already reports, so
    // the two tools rarely fire on the same line.
    //
    // Dormant while `reportUnusedDisableDirectives` is `"allow"`: with nothing judging directives,
    // there is nothing for oxlint to misjudge. Kept anyway, because it is the half that has to be
    // in place *before* the check comes back — verified: with this defaulting to `true` and the
    // check on, a legitimate `/* eslint-disable perfectionist/… */` over generated output is
    // reported as an unused directive at error.
    respectEslintDisableDirectives: false,
    typeAware: true,
  },
  overrides: [
    {
      // An ambient `declare module "x" { export { y } }` is a TypeScript declaration, not a
      // CommonJS export assignment, but oxlint's node plugin reads the `export` and reports it.
      // Scoped off rather than added to the shared list: eslint-plugin-n keeps
      // `n/no-exports-assign` at error and is right to, so turning it off everywhere would trade a
      // false positive for lost coverage.
      files: ["**/*.d.ts", "**/*.d.mts", "**/*.d.cts"],
      rules: {
        "node/no-exports-assign": "off",
      },
    },
    {
      // A tool config file's contract *is* its default export — `eslint.config.mjs`,
      // `vitest.config.ts`, `tsdown.config.ts` and the rest are read by their tool, not imported by
      // name. The rules stay on everywhere else, where named exports are the convention.
      //
      // This is the oxlint half of the `s0/config-file` block on the ESLint side: a narrow, scoped
      // exception rather than a line in the shared list, so the rule keeps working in `src/`.
      //
      // One pattern rather than an extension list: it has to cover both `vitest.config.ts` and the
      // `tsdown.config.<target>.ts` shape, where `.config.` sits in the middle of the name.
      files: ["**/*.config.*"],
      rules: {
        "import/no-anonymous-default-export": "off",
        "import/no-default-export": "off",
      },
    },
    {
      // The file scope oxlint's vitest plugin does not carry — see {@link vitestRulesOff}.
      //
      // Expressed as "everything except the tests" rather than "only the tests", because an
      // override adds to what is already on: the categories switch the vitest rules on globally, so
      // the only way to narrow them is to take them away where they do not belong.
      excludeFiles: GLOB_TESTS_OXLINT,
      files: ["**/*"],
      rules: vitestRulesOff,
    },
  ],
  // Every built-in plugin, generated from the pinned build's own schema — see ./plugins.generated.
  //
  // Omitting this key does not mean "all"; it means oxlint's default three (`unicorn`, `typescript`,
  // `oxc`), and the other twelve — import, promise, node, jsdoc, react, jsx-a11y, vitest, jest,
  // nextjs, react-perf, vue and the core `eslint` set — simply never ran. Their rules were already
  // censused in `rule-inventory.json` and already had entries in `src/lint-rules`, so the effect was
  // a rule set that looked decided but was not applied.
  //
  // Listing them replaces the default set rather than adding to it, which is why the list has to be
  // complete and why it is generated instead of typed out.
  //
  // Every one of them, because this object is the shape with no project attached: it is what
  // `eslint-plugin-oxlint` is handed when there is no manifest, and what `oxlintConfigFor` narrows.
  // The framework plugins are gated there — see {@link CONDITIONAL_PLUGIN_DEPENDENCIES}.
  plugins: [...OXLINT_PLUGINS],
  rules: {
    ...enabled,
    ...disabledRulesForOxlint(),
  },
};

/**
 * Options a consumer's `oxlint.config.mts` can pass, mirroring the ESLint half's.
 */
export interface OxlintDefineConfigOptions {
  /**
   * Apply the shared migration backlog — the rules in `src/lint-rules/temporary` that should be on
   * and are off only until the code is ready for them. Defaults to `true`.
   *
   * The ESLint half has had this since it was written; oxlint's did not, because
   * `disabledRulesForOxlint()` was called with no arguments at module scope and `defineConfig` had
   * nowhere to put an option. So `defineConfig(pkg, config, { temporaryRules: false })` raised the
   * bar in ESLint while oxlint kept every backlog rule off — and since `eslint-plugin-oxlint`
   * suppresses whatever oxlint reports, the documented "we are already clean, opt out" path made
   * the config quieter in the one place it claimed to make it stricter.
   */
  temporaryRules?: boolean | undefined;
}

/**
 * {@link oxlintConfig} narrowed to a project: framework plugins it does not depend on removed, and
 * the migration backlog dropped if it opted out.
 *
 * Exported so the ESLint half can build its `eslint-plugin-oxlint` suppressions from the same
 * config the project's oxlint run uses. That plugin turns an ESLint rule off on the premise that
 * oxlint is reporting the equivalent — so handing it a config claiming plugins the project does not
 * have, or turn-offs the project opted out of, would suppress rules nothing reports.
 */
export function oxlintConfigFor(
  packageJSON?: OxlintPackageJson,
  options?: OxlintDefineConfigOptions,
): Oxlintrc {
  return {
    ...oxlintConfig,
    plugins: oxlintPlugins(packageJSON),
    rules: {
      ...enabled,
      ...disabledRulesForOxlint({ temporary: options?.temporaryRules }),
    },
  };
}

/**
 * The entry point a consumer's `oxlint.config.mts` calls.
 *
 * Takes the project's `package.json` first, the way the ESLint half's `defineConfig` does and for
 * the same reason: which framework plugins run is a question about the project, and the manifest is
 * the only place the answer is written down. Passing nothing keeps every plugin, so a config
 * generated before this parameter existed behaves as it did.
 *
 * Then either an overrides object, shallow-merged over the base, or a function that receives the
 * base and returns the final config — the latter for extending an array or object field instead of
 * replacing it:
 *
 * ```ts
 * export default defineConfig(packageJSON, (base) => ({
 *   ...base,
 *   overrides: [...(base.overrides ?? []), { files: ["src/legacy/**"], rules: { … } }],
 * }));
 * ```
 *
 * The object form adds to the base rather than replacing the keys it names — see
 * {@link mergeConfig}. The function form is what to reach for when the base genuinely has to be
 * replaced or reordered.
 *
 * This is what a JSON config could not do. `extends` in a JSON config carries `rules`, `plugins`
 * and `overrides` and silently drops `env`, `globals`, `settings`, `ignorePatterns` and `options`,
 * so half of what this file decides never reached the project that extended it. Composing objects
 * in JS has nothing to drop.
 */
export const defineConfig = (
  packageJSON?: OxlintPackageJson,
  config?: ((base: Oxlintrc) => Oxlintrc) | Oxlintrc,
  options?: OxlintDefineConfigOptions,
): Oxlintrc => {
  const base = oxlintConfigFor(packageJSON, options);

  return typeof config === "function" ? config(base) : mergeConfig(base, config);
};

/**
 * Adds the caller's config to the base instead of replacing the keys it names.
 *
 * A spread was the obvious implementation and the wrong one. `rules` is a top-level key, so
 * `defineConfig(pkg, { rules: { "no-console": "off" } })` — the shape anyone would write to silence
 * one rule — replaced ~330 shared turn-offs with that one entry. Measured on this repository: 0
 * errors becomes 3989, including `import/no-named-export` and `import/prefer-default-export` firing
 * together, which cannot both be satisfied. The `ignorePatterns` and `options` variants of the same
 * mistake fail silently rather than loudly, which is worse.
 *
 * So: objects merge key by key, arrays append, and the caller still wins wherever they name the
 * same key. Replacing wholesale is still available and now has to be asked for, through the
 * function form — where `base` is in hand and dropping it is visibly deliberate.
 */
function mergeConfig(base: Oxlintrc, config?: Oxlintrc): Oxlintrc {
  if (!config) {
    return base;
  }

  const merged: Oxlintrc = { ...base, ...config };

  for (const key of ["categories", "env", "globals", "options", "rules", "settings"] as const) {
    if (base[key] && config[key]) {
      merged[key] = { ...base[key], ...config[key] } as never;
    }
  }

  if (base.overrides && config.overrides) {
    merged.overrides = [...base.overrides, ...config.overrides];
  }

  for (const key of ["ignorePatterns", "plugins"] as const) {
    if (base[key] && config[key]) {
      merged[key] = [...new Set([...base[key], ...config[key]])] as never;
    }
  }

  return merged;
}
