import type { ConfigWithExtendsArray } from "@eslint/config-helpers";
import type { Linter } from "eslint";
import type { PackageJson } from "type-fest";

export type Config = Omit<Linter.Config<Linter.RulesRecord>, "plugins"> & {
  // Relax plugins type limitation, as most of the plugins did not have correct type info yet.
  /**
   * An object containing a name-value mapping of plugin names to plugin objects. When `files` is
   * specified, these plugins are only available to the matching files.
   *
   * @see [Using plugins in your configuration](https://eslint.org/docs/latest/user-guide/configuring/configuration-files-new#using-plugins-in-your-configuration)
   */
  plugins?: Record<string, any>;
};

export type ConfigNames =
  | "antfu/astro/rules"
  | "antfu/astro/setup"
  | "antfu/command/rules"
  | "antfu/disables/bin"
  | "antfu/disables/cjs"
  | "antfu/disables/cli"
  | "antfu/disables/config-files"
  | "antfu/disables/dts"
  | "antfu/disables/scripts"
  | "antfu/eslint-comments/rules"
  | "antfu/formatter/astro"
  | "antfu/formatter/astro/disables"
  | "antfu/formatter/css"
  | "antfu/formatter/graphql"
  | "antfu/formatter/html"
  | "antfu/formatter/less"
  | "antfu/formatter/markdown"
  | "antfu/formatter/scss"
  | "antfu/formatter/setup"
  | "antfu/formatter/svg"
  | "antfu/formatter/xml"
  | "antfu/gitignore"
  | "antfu/ignores"
  | "antfu/imports/rules"
  | "antfu/javascript/rules"
  | "antfu/javascript/setup"
  | "antfu/jsdoc/rules"
  | "antfu/jsonc/rules"
  | "antfu/jsonc/setup"
  | "antfu/jsx/setup"
  | "antfu/markdown/disables"
  | "antfu/markdown/parser"
  | "antfu/markdown/processor"
  | "antfu/markdown/setup"
  | "antfu/nextjs/rules"
  | "antfu/nextjs/setup"
  | "antfu/node/rules"
  | "antfu/perfectionist/setup"
  | "antfu/pnpm/package-json"
  | "antfu/pnpm/pnpm-workspace-yaml"
  | "antfu/pnpm/pnpm-workspace-yaml-sort"
  | "antfu/react/rules"
  | "antfu/react/setup"
  | "antfu/react/type-aware-rules"
  | "antfu/regexp/rules"
  | "antfu/solid/rules"
  | "antfu/solid/setup"
  | "antfu/sort/package-json"
  | "antfu/sort/tsconfig-json"
  | "antfu/stylistic/rules"
  | "antfu/svelte/rules"
  | "antfu/svelte/setup"
  | "antfu/test/rules"
  | "antfu/test/setup"
  | "antfu/typescript/erasable-syntax-only"
  | "antfu/typescript/parser"
  | "antfu/typescript/rules"
  | "antfu/typescript/rules-type-aware"
  | "antfu/typescript/setup"
  | "antfu/typescript/type-aware-parser"
  | "antfu/unicorn/rules"
  | "antfu/unocss"
  | "antfu/vue/rules"
  | "antfu/vue/setup";

export type DefineConfigFn = (
  packageJSON: PackageJson,
  config?: ConfigWithExtendsArray,
  options?: DefineConfigOptions,
) => Promise<ConfigWithExtendsArray>;

export interface DefineConfigOptions {
  globalIgnores?: string[];
  plugins?: {
    "arrow-return-style"?: {
      disabled?: boolean;
    };
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
    json?: {
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
    "no-unsanitized"?: {
      disabled?: boolean;
    };
    "no-use-extend-native"?: {
      disabled?: boolean;
    };
    oxlint?: {
      configFilePath?: string;
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
    "react-perf"?: {
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
