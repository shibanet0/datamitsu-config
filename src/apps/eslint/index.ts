import { type Awaitable, FlatConfigComposer } from "eslint-flat-config-utils";
import { globalIgnores } from "eslint/config";

import type {
  ConfigNames,
  DefineConfigFn as DefineConfigFunction,
  DefineConfigOptions,
  TypedFlatConfigItem,
} from "./types";

import { disabledRulesForESLint } from "../../lint-rules";
import {
  GLOB_EXCLUDE,
  GLOB_HTML,
  GLOB_JSON,
  GLOB_JSON5,
  GLOB_JSONC,
  GLOB_SRC_EXT,
  GLOB_TOML,
  GLOB_YAML,
} from "./globs";

export { globalIgnores } from "@eslint/config-helpers";

interface PluginEntry {
  condition?: boolean;
  loader: () => Awaitable<TypedFlatConfigItem[]>;
  name: string;
}

/**
 * Every plugin this config ships is loaded. There is deliberately nothing off by default: a plugin
 * that is a dependency but never runs is weight every consumer downloads for no check, and its
 * rules sit outside the inventory, so a bump can change them with nobody noticing. A rule that is
 * not wanted is turned off by name in `src/lint-rules`, where the reason is written down — a whole
 * plugin switched off silently is the thing that list exists to replace.
 */
const defaultOptions: DefineConfigOptions = {
  plugins: {},
};

/**
 * Stamps an `s0/*` name onto every block a plugin entry produces.
 *
 * Names are how a consumer addresses a block, and how ESLint identifies one in an error message or
 * in `--inspect-config`. Two thirds of the blocks here had no name at all, and eleven carried the
 * upstream preset's — `node/flat/recommended-module`, `storybook:recommended:stories-rules` — which
 * is a name that changes when the plugin reorganizes its presets, and reads as though the plugin
 * owns a decision this package made.
 *
 * Doing it here rather than in forty plugin files means a new plugin is named correctly by
 * construction. A block that already names itself `s0/...` is left alone: those are the ones with
 * something specific to say.
 */
function nameConfigs(entryName: string, loaded: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  // Flattened first: a few plugins hand back a preset that is itself an array of blocks, and the
  // composer only flattens later. Spreading one of those into an object produces numeric keys and
  // ESLint rejects the config outright.
  const configs = loaded.flat() as TypedFlatConfigItem[];

  return configs.map((item, index) => {
    if (item.name?.startsWith("s0/")) {
      return item;
    }

    // An upstream preset that names itself keeps that name, under the s0 prefix — it says more than
    // a position does, and when a plugin reorganizes its presets the rename lands in the generated
    // `ConfigNames` diff, where it can be looked at. Anonymous blocks fall back to their index.
    // `compat/flat/recommended` under entry `compat` would read `s0/compat/compat/flat/recommended`,
    // so a leading copy of the entry name is dropped.
    const upstream = item.name?.replace(new RegExp(`^${entryName}/`), "");
    const suffix = upstream ?? (configs.length > 1 ? String(index) : "");

    return {
      ...item,
      name: suffix ? `s0/${entryName}/${suffix}` : `s0/${entryName}`,
    };
  });
}

/**
 * Returns the configs with every warn-level severity raised to error, leaving options and scoping
 * untouched. Rule entries are copied rather than mutated — a plugin's exported config object is
 * shared, and editing it would leak into anything else that loaded the same plugin.
 */
function raiseWarningsToErrors(configs: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  return configs.map((item) => {
    if (!item.rules) {
      return item;
    }

    let changed = false;
    const rules: NonNullable<TypedFlatConfigItem["rules"]> = {};

    for (const [name, entry] of Object.entries(item.rules)) {
      const severity = Array.isArray(entry) ? entry[0] : entry;

      if (severity === "warn" || severity === 1) {
        rules[name] = Array.isArray(entry) ? ["error", ...entry.slice(1)] : "error";
        changed = true;
      } else {
        rules[name] = entry;
      }
    }

    return changed ? { ...item, rules } : item;
  });
}

export const defineConfig: DefineConfigFunction = async (packageJSON, config, options) => {
  const _options: DefineConfigOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
    },
  };

  const dependencies = {
    ...packageJSON?.dependencies,
    ...packageJSON?.devDependencies,
    ...packageJSON?.peerDependencies,
    ...packageJSON?.optionalDependencies,
  };
  const dependenciesKeys = Object.keys(dependencies);

  const has = (...names: string[]): boolean =>
    names.some((name) => Object.hasOwn(dependencies, name));

  const hasScope = (scope: string): boolean =>
    dependenciesKeys.some((element) => element.startsWith(scope));

  /**
   * Named dependencies rather than prefix matching.
   *
   * `startsWith("react-")` was the react test, and it is true of `react-docgen`, `react-scripts`
   * and every other tool that merely has React in its name — a build-time dependency would switch
   * on the whole React, hooks, a11y and refresh rule set for a project that renders nothing. `next`
   * is here because a Next.js project has React whether or not it depends on it directly.
   */
  const isReactEnabled = has("@types/react", "next", "react", "react-dom");

  const enableReact = options?.react === undefined ? isReactEnabled : options.react;

  /**
   * `@playwright/test` is the package a playwright project actually installs — the runner. Testing
   * only for `playwright`, the library, missed nearly every real project.
   */
  const isPlaywrightEnabled = has("@playwright/test", "playwright");
  const isVitestEnabled = has("vitest");
  const isStorybookEnabled = has("storybook") || hasScope("@storybook/");
  /**
   * Exact names rather than a substring test, which was also true of `i18next-parser` — a CLI that
   * extracts strings at build time and says nothing about the code being linted.
   */
  const isI18nextEnabled = has("i18next", "next-i18next", "react-i18next");
  const isClsxEnabled = has("clsx");
  const isNextEnabled = has("next");

  /**
   * Both browser-compatibility plugins are gated on the project declaring browser targets.
   *
   * `compat/compat` is already parked in `src/lint-rules/temporary` with exactly this reason: with
   * no browserslist it falls back to a default browser list and reports against Opera Mini. The
   * escompat half has the identical dependency and had no gate, no `files` and no list entry — so a
   * Node-only service with `engines.node >= 22` failed on `escompat/no-regexp-v-flag` citing
   * "chrome 109". Only two of its 27 rules are reachable today, but that set is a function of the
   * caniuse snapshot and grows silently on a `caniuse-lite` bump.
   *
   * The manifest field only, not `.browserslistrc`: this config is handed a `package.json`, not a
   * directory, and reading the filesystem during config resolution is a coupling not worth the case
   * it covers. A project that keeps its targets in the dotfile turns the plugins back on through
   * `options.plugins`.
   */
  const hasBrowserTargets = Boolean(
    (packageJSON as undefined | { browserslist?: unknown })?.browserslist,
  );

  const configs: Awaitable<TypedFlatConfigItem[]>[] = [
    [globalIgnores(GLOB_EXCLUDE, "s0/ignores") as TypedFlatConfigItem],
    import("./plugins/javascript").then(async (r) =>
      nameConfigs("javascript", await r.javascript()),
    ),
    import("./plugins/typescript").then(async (r) =>
      nameConfigs("typescript", await r.typescript()),
    ),
  ];

  const pluginRegistry: PluginEntry[] = [
    { loader: () => import("./plugins/command").then((r) => r.command()), name: "command" },
    {
      loader: () => import("./plugins/eslint-comments").then((r) => r.eslintComments()),
      name: "eslint-comments",
    },
    {
      condition: isNextEnabled,
      loader: () => import("./plugins/next").then((r) => r.next()),
      name: "next",
    },
    { loader: () => import("./plugins/unicorn").then((r) => r.unicorn()), name: "unicorn" },
    { loader: () => import("./plugins/sonarjs").then((r) => r.sonarjs()), name: "sonarjs" },
    { loader: () => import("./plugins/e18e").then((r) => r.e18e()), name: "e18e" },
    {
      condition: isClsxEnabled,
      loader: () => import("./plugins/clsx").then((r) => r.clsx()),
      name: "clsx",
    },
    { loader: () => import("./plugins/deMorgan").then((r) => r.deMorgan()), name: "deMorgan" },
    {
      loader: () => import("./plugins/perfectionist").then((r) => r.perfectionist()),
      name: "perfectionist",
    },
    {
      loader: () => import("./plugins/arrayFunc").then((r) => r.arrayFunc()),
      name: "eslint-plugin-array-func",
    },
    {
      loader: () => import("./plugins/unused-imports").then((r) => r.unusedImports()),
      name: "unused-imports",
    },
    { loader: () => import("./plugins/fsecond").then((r) => r.fsecond()), name: "fsecond" },
    {
      loader: () => import("./plugins/import").then((r) => r.pluginImport()),
      name: "import",
    },
    { loader: () => import("./plugins/regexp").then((r) => r.regexp()), name: "regexp" },
    { loader: () => import("./plugins/promise").then((r) => r.promise()), name: "promise" },
    { loader: () => import("./plugins/turbo").then((r) => r.turbo()), name: "turbo" },
    { loader: () => import("./plugins/depend").then((r) => r.depend()), name: "depend" },
    {
      loader: () => import("./plugins/boundaries").then((r) => r.boundaries()),
      name: "boundaries",
    },
    {
      loader: () => import("./plugins/no-use-extend-native").then((r) => r.noUseExtendNative()),
      name: "no-use-extend-native",
    },
    { loader: () => import("./plugins/security").then((r) => r.security()), name: "security" },
    { loader: () => import("./plugins/prettier").then((r) => r.prettier()), name: "prettier" },
    {
      loader: () => import("./plugins/vanilla-extract").then((r) => r.vanillaExtract()),
      name: "vanilla-extract",
    },
    {
      condition: isPlaywrightEnabled,
      loader: () => import("./plugins/playwright").then((r) => r.playwright()),
      name: "playwright",
    },
    { loader: () => import("./plugins/n").then((r) => r.n()), name: "n" },
    {
      loader: () => import("./plugins/no-unsanitized").then((r) => r.noUnsanitized()),
      name: "no-unsanitized",
    },
    { loader: () => import("./plugins/json").then((r) => r.json()), name: "json" },
    { loader: () => import("./plugins/jsdoc").then((r) => r.jsdoc()), name: "jsdoc" },
    {
      condition: hasBrowserTargets,
      loader: () => import("./plugins/compat").then((r) => r.compat()),
      name: "compat",
    },
    {
      loader: () => import("./plugins/json-schema-validator").then((r) => r.jsonSchemaValidator()),
      name: "json-schema-validator",
    },
    { loader: () => import("./plugins/pnpm").then((r) => r.pnpm()), name: "pnpm" },
    {
      condition: isI18nextEnabled,
      loader: () => import("./plugins/i18next").then((r) => r.i18next()),
      name: "i18next",
    },
    {
      condition: hasBrowserTargets,
      loader: () => import("./plugins/escompat").then((r) => r.escompat()),
      name: "escompat",
    },
    { loader: () => import("./plugins/html").then((r) => r.html()), name: "html" },
    { loader: () => import("./plugins/jsonc").then((r) => r.jsonc()), name: "jsonc" },
    {
      condition: isVitestEnabled,
      loader: () => import("./plugins/vitest").then((r) => r.vitest()),
      name: "vitest",
    },
    {
      loader: () => import("./plugins/stylistic").then((r) => r.stylistic()),
      name: "stylistic",
    },
  ];

  for (const entry of pluginRegistry) {
    if (entry.condition === false) {
      continue;
    }
    if (_options?.plugins?.[entry.name as keyof typeof _options.plugins]?.disabled) {
      continue;
    }
    configs.push(Promise.resolve(entry.loader()).then((loaded) => nameConfigs(entry.name, loaded)));
  }

  if (enableReact) {
    const reactPluginRegistry: PluginEntry[] = [
      {
        loader: () =>
          import("./plugins/react").then((r) => {
            const reactVersion = options?.plugins?.react?.version || dependencies["react"];
            return r.react({
              ...options?.plugins?.react,
              ...(reactVersion && { version: reactVersion }),
            });
          }),
        name: "react",
      },
      {
        loader: () =>
          import("./plugins/react-you-might-not-need-an-effect").then((r) =>
            r.reactYouMightNotNeedAnEffect(),
          ),
        name: "react-you-might-not-need-an-effect",
      },
      {
        loader: () =>
          import("./plugins/react-prefer-function-component").then((r) =>
            r.reactPreferFunctionComponent(),
          ),
        name: "react-prefer-function-component",
      },
      {
        loader: () => import("./plugins/jsx-a11y").then((r) => r.jsxA11y()),
        name: "jsx-a11y",
      },
      {
        loader: () => import("./plugins/react-hooks").then((r) => r.reactHooks()),
        name: "react-hooks",
      },
      {
        condition: isStorybookEnabled,
        loader: () => import("./plugins/storybook").then((r) => r.storybook()),
        name: "storybook",
      },
      {
        loader: () => import("./plugins/react-refresh").then((r) => r.reactRefresh()),
        name: "react-refresh",
      },
    ];

    for (const entry of reactPluginRegistry) {
      if (entry.condition === false) {
        continue;
      }
      if (_options?.plugins?.[entry.name as keyof typeof _options.plugins]?.disabled) {
        continue;
      }
      configs.push(
        Promise.resolve(entry.loader()).then((loaded) => nameConfigs(entry.name, loaded)),
      );
    }
  }

  if (!_options?.plugins?.oxlint?.disabled) {
    configs.push(
      import("./plugins/oxlint").then(async (r) =>
        // The same `temporaryRules` the shared block below is given. The suppressions this builds
        // are claims that oxlint reports the rule; a project that opted out of the backlog is
        // asking both tools to report it, so the claim has to be evaluated against that answer.
        nameConfigs(
          "oxlint",
          await r.oxlint(
            packageJSON,
            { temporaryRules: _options.temporaryRules },
            _options.oxlintConfig,
          ),
        ),
      ),
    );
  }

  const resolved = await Promise.all(configs).then((r) => r.flat());

  const composer = new FlatConfigComposer<TypedFlatConfigItem, ConfigNames>();

  // A rule block with no `files` applies to every file any other block matches — including the JSON
  // and HTML ones. Measured on a maximal project: 416 of the 534 rules that run on a `.tsx` file
  // were also running against `package.json`, parsed as JSONC. None of them can match there.
  //
  // Today that is only waste. ESLint 10.2 added `meta.languages`, and a rule whose declared
  // language does not match the config's is a hard `TypeError` per file, not a warning — so the
  // first plugin release that fills the field turns every JSON file in every consuming project into
  // a config error. Nothing has filled it yet: 0 of the 1105 rules loaded here declare it.
  //
  // `setDefaultIgnores` applies only to blocks that have rules and no `files`, `ignores` or
  // `language` of their own, which is exactly the set at fault; the blocks that own these languages
  // scope themselves and are untouched. It is a backstop rather than the fix — a block added later
  // still gets it for free, whereas per-block `files` has to be remembered.
  //
  // YAML and TOML belong on the list for the same reason and were missed: `json-schema-validator`'s
  // preset installs `yaml-eslint-parser` and `toml-eslint-parser`, so this config teaches ESLint to
  // parse both — and then 331 JavaScript rules resolved against a YAML AST. Not theoretical:
  // sonarjs has a rule that reports unresolved-work markers in comments, and it fired on an
  // ordinary `#` comment in a `.toml`; `# eslint-disable` in YAML is likewise read as a directive.
  // Reachable through `eslint .` and the editor, though not through `dm lint`, which passes an
  // explicit file list.
  //
  // That rule is also why neither it nor the marker is named here: it reads comment text, and the
  // rule's own name contains the token, so quoting either made this file report itself.
  composer.setDefaultIgnores(() => [
    GLOB_JSON,
    GLOB_JSON5,
    GLOB_JSONC,
    GLOB_HTML,
    GLOB_YAML,
    GLOB_TOML,
  ]);

  composer.append(...raiseWarningsToErrors(resolved));

  // `warn` is not a severity this config uses, so every rule a plugin preset left at warn is raised
  // to error.
  //
  // datamitsu runs eslint with `--quiet`, which reports errors only. A warn-level rule therefore
  // fails nothing and prints nothing — it is off in every way that matters, except that it still
  // runs on every file and still shows up in an editor. Three severities where the runner
  // understands two is not a softer bar, it is a rule nobody can act on. oxlint has no warn tier at
  // all, which is the behavior being matched.
  //
  // Rewritten in place rather than appended as one overriding block: a plugin's rules are only
  // addressable from a config object that registers that plugin, and several are scoped to `files`
  // as well, so a flat block naming them all fails to resolve the plugin. Editing the severity
  // where the rule was declared keeps both the plugin registration and the file scope.
  //
  // Done for every resolved config, so a plugin bump that introduces a warn-level rule is raised the
  // moment it appears rather than waiting for someone to notice. What the shared lists turn off is
  // applied after this and still wins.

  // The disabled rules oxlint and ESLint share, applied last so they win over every plugin's
  // recommended config — including eslint-plugin-oxlint's.
  //
  // That plugin turns an ESLint rule off only while oxlint is *reporting* the equivalent, so
  // silencing a rule in the oxlint config used to hand it straight back to ESLint: same finding,
  // same file, still failing, now under a different rule name. Both tools reading one list is what
  // stops that — and it is why a project no longer needs a wall of local turn-offs to adopt this
  // config at all. Appended before the caller's own config, so a consumer can still re-enable.
  composer.append({
    // `ignores: []` ignores nothing; it is here to opt this block out of `setDefaultIgnores`, which
    // exempts any block that scopes itself. Without it the shared turn-offs would stop applying to
    // JSON and HTML — and the plugins that own those languages *do* scope themselves, so their
    // rules would come back on for exactly the files they target while the disable did not follow.
    ignores: [],
    name: "s0/disabled-rules",
    rules: disabledRulesForESLint({ temporary: _options.temporaryRules }),
  });

  // The datamitsu config file is evaluated by goja, not Node. It has no module system to export
  // from, so the entry points must be published by assigning onto the global object
  // (`globalThis.getConfig = getConfig`) — the shape `datamitsu init` generates and the runtime
  // requires. unicorn 73's no-global-object-property-assignment flags exactly that, which made
  // `dm setup` fail on the config file datamitsu had just written. Scoped to those files only, so
  // the rule keeps working everywhere else. Appended before the caller's own config, so a
  // consumer can still override it.
  composer.append({
    files: [`**/datamitsu.config.${GLOB_SRC_EXT}`, `**/datamitsu.config.*.${GLOB_SRC_EXT}`],
    name: "s0/config-file",
    rules: {
      "unicorn/no-global-object-property-assignment": "off",
    },
  });

  composer.append(...((config || []) as unknown as TypedFlatConfigItem[]));

  return composer;
};
