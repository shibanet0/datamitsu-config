import { type Awaitable, FlatConfigComposer } from "eslint-flat-config-utils";
import { globalIgnores } from "eslint/config";

import type {
  ConfigNames,
  DefineConfigFn as DefineConfigFunction,
  DefineConfigOptions,
  TypedFlatConfigItem,
} from "./types";

import { GLOB_EXCLUDE, GLOB_SRC_EXT } from "./globs";

export { globalIgnores } from "@eslint/config-helpers";

interface PluginEntry {
  condition?: boolean;
  loader: () => Awaitable<TypedFlatConfigItem[]>;
  name: string;
}

const defaultOptions: DefineConfigOptions = {
  plugins: {
    "arrow-return-style": { disabled: true },
    compat: { disabled: true },
    depend: { disabled: true },
    e18e: { disabled: true },
    n: { disabled: true },
    "no-unsanitized": { disabled: true },
    "no-use-extend-native": { disabled: true },
    regexp: { disabled: true },
    turbo: { disabled: true },
    "vanilla-extract": { disabled: true },
  },
};

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

  const isPlaywrightEnabled = dependenciesKeys.some((element) => element === "playwright");
  const isVitestEnabled = dependenciesKeys.some((element) => element === "vitest");
  const isStorybookEnabled = dependenciesKeys.some(
    (element) => element === "storybook" || element.startsWith("@storybook/"),
  );
  const isI18nextEnabled = dependenciesKeys.some((element) => element.includes("i18next"));
  const isClsxEnabled = dependenciesKeys.some((element) => element === "clsx");

  const configs: Awaitable<TypedFlatConfigItem[]>[] = [
    [globalIgnores(GLOB_EXCLUDE, "shibanet0/ignores") as TypedFlatConfigItem],
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
      loader: () => import("./plugins/arrow-return-style").then((r) => r.arrowReturnStyle()),
      name: "arrow-return-style",
    },
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

  composer.append(...resolved);

  // The datamitsu config file is evaluated by goja, not Node. It has no module system to export
  // from, so the entry points must be published by assigning onto the global object
  // (`globalThis.getConfig = getConfig`) — the shape `datamitsu init` generates and the runtime
  // requires. unicorn 73's no-global-object-property-assignment flags exactly that, which made
  // `dm setup` fail on the config file datamitsu had just written. Scoped to those files only, so
  // the rule keeps working everywhere else. Appended before the caller's own config, so a
  // consumer can still override it.
  composer.append({
    files: [`**/datamitsu.config.${GLOB_SRC_EXT}`, `**/datamitsu.config.*.${GLOB_SRC_EXT}`],
    name: "datamitsu/config-file",
    rules: {
      "unicorn/no-global-object-property-assignment": "off",
    },
  });

  composer.append(...((config || []) as unknown as TypedFlatConfigItem[]));

  return composer;
};
