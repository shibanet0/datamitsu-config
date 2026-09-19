import type { ConfigWithExtendsArray } from "@eslint/config-helpers";
import type { Linter } from "eslint";
import type { PackageJson } from "type-fest";

export type { ConfigNames } from "../../lint-rules/rule-names.generated";

export type DefineConfigFn = (
  packageJSON: PackageJson,
  config?: ConfigWithExtendsArray,
  options?: DefineConfigOptions,
) => Promise<ConfigWithExtendsArray>;

export interface DefineConfigOptions {
  /**
   * The project's own resolved oxlint config, when it differs from this package's.
   *
   * `eslint-plugin-oxlint` turns an ESLint rule off on the premise that oxlint reports the
   * equivalent, so that decision has to be made against the config oxlint is actually running. By
   * default it is made against this package's, which is right until the project customizes
   * `oxlint.config.mts` — and then a rule the project turned off there is reported by **neither**
   * tool: oxlint stops, and the ESLint suppression built from the untouched base keeps it off. That
   * is the exact failure the shared list exists to prevent, relocated to the consumer's config
   * where it is harder to see.
   *
   * A project that overrides anything in `oxlint.config.mts` should pass the same object here:
   *
   * ```js
   * import oxlintConfig from "./oxlint.config.mts";
   *
   * export default await defineConfig(packageJSON, undefined, { oxlintConfig });
   * ```
   */
  oxlintConfig?: unknown;
  plugins?: {
    boundaries?: {
      disabled?: boolean;
    };
    clsx?: {
      disabled?: boolean;
    };
    command?: {
      disabled?: boolean;
    };
    compat?: {
      disabled?: boolean;
    };
    deMorgan?: {
      disabled?: boolean;
    };
    depend?: {
      disabled?: boolean;
    };
    e18e?: {
      disabled?: boolean;
    };
    escompat?: {
      disabled?: boolean;
    };
    "eslint-comments"?: {
      disabled?: boolean;
    };
    "eslint-plugin-array-func"?: {
      disabled?: boolean;
    };
    fsecond?: {
      disabled?: boolean;
    };
    html?: {
      disabled?: boolean;
    };
    i18next?: {
      disabled?: boolean;
    };
    import?: {
      disabled?: boolean;
    };
    jsdoc?: {
      disabled?: boolean;
    };
    "json-schema-validator"?: {
      disabled?: boolean;
    };
    jsonc?: {
      disabled?: boolean;
    };
    "jsx-a11y"?: {
      disabled?: boolean;
    };
    n?: {
      disabled?: boolean;
    };
    next?: {
      disabled?: boolean;
    };
    "no-unsanitized"?: {
      disabled?: boolean;
    };
    "no-use-extend-native"?: {
      disabled?: boolean;
    };
    oxlint?: {
      disabled?: boolean;
    };
    perfectionist?: {
      disabled?: boolean;
    };
    playwright?: {
      disabled?: boolean;
    };
    pnpm?: {
      disabled?: boolean;
    };
    prettier?: {
      disabled?: boolean;
    };
    promise?: {
      disabled?: boolean;
    };
    react?: {
      disabled?: boolean;
      version?: string;
    };
    "react-hooks"?: {
      disabled?: boolean;
    };
    "react-prefer-function-component"?: {
      disabled?: boolean;
    };
    "react-refresh"?: {
      disabled?: boolean;
    };
    "react-you-might-not-need-an-effect"?: {
      disabled?: boolean;
    };
    regexp?: {
      disabled?: boolean;
    };
    security?: {
      disabled?: boolean;
    };
    sonarjs?: {
      disabled?: boolean;
    };
    storybook?: {
      disabled?: boolean;
    };
    stylistic?: {
      disabled?: boolean;
    };
    turbo?: {
      disabled?: boolean;
    };
    unicorn?: {
      disabled?: boolean;
    };
    "unused-imports"?: {
      disabled?: boolean;
    };
    "vanilla-extract"?: {
      disabled?: boolean;
    };
    vitest?: {
      disabled?: boolean;
    };
  };

  react?: boolean;

  /**
   * Apply the shared migration backlog — the rules in `src/lint-rules/temporary` that should be on
   * and are off only until the code is ready for them. Defaults to `true`.
   *
   * Set to `false` to lint against the bar the backlog is deferring. The permanently disabled rules
   * stay off either way; those are decisions, not deferrals.
   *
   * Passed straight through to the oxlint half as well, so both tools answer the same question. It
   * did not use to be: the oxlint config had no such option, so opting out raised the bar in ESLint
   * while oxlint kept the whole backlog off.
   */
  temporaryRules?: boolean;
}

export type Rules = Record<string, Linter.RuleEntry<any> | undefined>;

/**
 * An updated version of ESLint's `Linter.Config`, which provides autocompletion for `rules` and
 * relaxes type limitations for `plugins` and `rules`, because many plugins still lack proper type
 * definitions.
 */
export type TypedFlatConfigItem = Omit<Linter.Config, "plugins" | "rules"> & {
  /**
   * An object containing a name-value mapping of plugin names to plugin objects. When `files` is
   * specified, these plugins are only available to the matching files.
   *
   * @see [Using plugins in your configuration](https://eslint.org/docs/latest/user-guide/configuring/configuration-files-new#using-plugins-in-your-configuration)
   */
  plugins?: Record<string, any>;

  /**
   * An object containing the configured rules. When `files` or `ignores` are specified, these rule
   * configurations are only available to the matching files.
   */
  rules?: Rules;
};
