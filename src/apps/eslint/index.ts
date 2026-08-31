import { type Awaitable, FlatConfigComposer } from "eslint-flat-config-utils";
import { globalIgnores } from "eslint/config";

import type {
  ConfigNames,
  DefineConfigFn as DefineConfigFunction,
  DefineConfigOptions,
  TypedFlatConfigItem,
} from "./types";

import { disabledRulesForESLint } from "../../lint-rules";
import { GLOB_EXCLUDE, GLOB_SRC_EXT } from "./globs";

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

  const isReactEnabled = dependenciesKeys.some(
    (element) => element.startsWith("react-") || element === "@types/react" || element === "react",
  );

  const enableReact = options?.react === undefined ? isReactEnabled : options.react;

  const isPlaywrightEnabled = dependenciesKeys.includes("playwright");
  const isVitestEnabled = dependenciesKeys.includes("vitest");
  const isStorybookEnabled = dependenciesKeys.some(
    (element) => element === "storybook" || element.startsWith("@storybook/"),
  );
  const isI18nextEnabled = dependenciesKeys.some((element) => element.includes("i18next"));
  const isClsxEnabled = dependenciesKeys.includes("clsx");

  const configs: Awaitable<TypedFlatConfigItem[]>[] = [
    [globalIgnores(GLOB_EXCLUDE, "s0/ignores") as TypedFlatConfigItem],
    import("./plugins/javascript").then((r) => r.javascript()),
    import("./plugins/typescript").then((r) => r.typescript()),
  ];

  const pluginRegistry: PluginEntry[] = [
    { loader: () => import("./plugins/command").then((r) => r.command()), name: "command" },
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
    { loader: () => import("./plugins/compat").then((r) => r.compat()), name: "compat" },
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
    { loader: () => import("./plugins/escompat").then((r) => r.escompat()), name: "escompat" },
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
    configs.push(entry.loader());
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
      configs.push(entry.loader());
    }
  }

  if (!_options?.plugins?.oxlint?.disabled) {
    configs.push(import("./plugins/oxlint").then((r) => r.oxlint(options?.plugins?.oxlint)));
  }

  const resolved = await Promise.all(configs).then((r) => r.flat());

  const composer = new FlatConfigComposer<TypedFlatConfigItem, ConfigNames>();

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
