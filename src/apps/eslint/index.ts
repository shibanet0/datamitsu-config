import { type Awaitable, FlatConfigComposer } from "eslint-flat-config-utils";
import { globalIgnores } from "eslint/config";

import type {
  ConfigNames,
  DefineConfigFn,
  DefineConfigOptions,
  TypedFlatConfigItem,
} from "./types";

import { GLOB_EXCLUDE } from "./globs";

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

export const defineConfig: DefineConfigFn = async (packageJSON, config, options) => {
  const _options: DefineConfigOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
    },
  };

  const deps = {
    ...packageJSON?.dependencies,
    ...packageJSON?.devDependencies,
    ...packageJSON?.peerDependencies,
    ...packageJSON?.optionalDependencies,
  };
  const depsKeys = Object.keys(deps);

  const isReactEnabled = depsKeys.some(
    (el) => el.startsWith("react-") || el === "@types/react" || el === "react",
  );

  const enableReact = options?.react === undefined ? isReactEnabled : options.react;

  const isPlaywrightEnabled = depsKeys.some((el) => el === "playwright");
  const isVitestEnabled = depsKeys.some((el) => el === "vitest");
  const isStorybookEnabled = depsKeys.some(
    (el) => el === "storybook" || el.startsWith("@storybook/"),
  );
  const isI18nextEnabled = depsKeys.some((el) => el.includes("i18next"));
  const isClsxEnabled = depsKeys.some((el) => el === "clsx");

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
            const reactVersion = options?.plugins?.react?.version || deps["react"];
            return r.react({
              ...options?.plugins?.react,
              ...(reactVersion ? { version: reactVersion } : {}),
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
        loader: () => import("./plugins/react-perf").then((r) => r.reactPerf()),
        name: "react-perf",
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

  composer.append(...((config || []) as unknown as TypedFlatConfigItem[]));

  return composer;
};
