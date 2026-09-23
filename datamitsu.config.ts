/// <reference path="./.datamitsu/datamitsu.config.d.ts" />

const _getConfig = (config: config.Config): config.Config => ({
  ...config,
  managedConfigs: {
    ...config.managedConfigs,
    "cspell.config.mjs": {
      ...config.managedConfigs?.["cspell.config.mjs"],
      content: () => /* js */ `import { defineConfig } from "./.datamitsu/cspell.config.mjs";

export default defineConfig((prev) => {
  const words = ${JSON.stringify(cspellWords, null, 2)};

  return ({
  ...prev,
  ignorePaths: [...(prev.ignorePaths ?? []), "**/dependabot_schema.d.ts"],
  words: [
    ...(prev.words || []),
    ...words
  ],
})});
`,
      expectChainHash: "xxh3:84e8fe2861e794390eb299da516f3d4b",
    },
    "eslint.config.mjs": {
      ...config.managedConfigs?.["eslint.config.mjs"],
      content: () => /* js */ `import { globalIgnores } from "@eslint/config-helpers";

import { defineConfig } from "./.datamitsu/eslint.config.mjs";
import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
  /**
   * @type {import("./dist/type-fest").PackageJson}
   */ (packageJSON),
  undefined,
  {
    plugins: {
      e18e: {
        disabled: true,
      },
      react: {
        version: "19.2.3",
      },
    },
    react: true,
  },
);

export default [
  // dist-* are this repo's build outputs (the inline config bundles and the goja bundle), and
  // GLOB_EXCLUDE covers "dist", not the "dist-<name>" convention used here.
  globalIgnores([".datamitsu/", "dist-*/"]),
  ...config,
];
`,
      expectChainHash: "xxh3:ea24f762083724bd24ff7b682423d630",
    },
    "knip.config.js": {
      ...config.managedConfigs?.["knip.config.js"],
      content: () => /* js */ `import { defineConfig } from "./.datamitsu/knip.config.js";

// No \`adopted\`: this repository holds the bar the shared config states, so it
// has nothing to narrow. The function form replaces what it names, so every
// list below extends the base rather than dropping the managed entries.
export default defineConfig((prev) => ({
  ...prev,
  entry: [
    ...(prev.entry ?? []),
    // One tsdown config per inline-config bundle; see tsdown.config.*.ts.
    "src/apps/*/index.ts",
    "src/datamitsu-api/index.ts",
    "src/datamitsu-config/datamitsu.config.ts",
    "src/s0/index.ts",
    "src/type-fest/index.ts",
    "src/type-fest/globals/index.ts",
    // Build-time generators, run from Taskfile.yaml rather than imported.
    "scripts/*.ts",
    "bin/*.js",
    "tsdown.config*.ts",
    "vitest.config.ts",
    "vitest.setup.ts",
  ],

  ignore: [
    ...(prev.ignore ?? []),
    // Spawned by path from proxy.test.ts, never imported.
    "src/apps/lefthook-proxy/__tests__/fixtures/fake-upstream.mjs",
  ],

  ignoreDependencies: [
    ...(prev.ignoreDependencies ?? []),
    // Required at runtime by code no import reaches. The bundled cspell config
    // resolves its dictionary out of the managed cspell app's node_modules, and
    // eslint-plugin-compat — which apps/eslint/plugins/compat.ts does register —
    // requires caniuse-lite without declaring it. See apps/eslint.deps.ts.
    "@cspell/dict-ru_ru",
    "caniuse-lite",

    // Named by \`src/apps/stylelint/index.ts\` and resolved out of the managed
    // stylelint app's node_modules, never from this repository — the same shape
    // as the cspell dictionary above. They surface here and not in a consuming
    // project because this repository puts \`src/apps/*/index.ts\` in the entry
    // graph, so knip reads the source that names them rather than the bundle.
    // Verified on a fixture consumer: no such finding there.
    "stylelint-config-html",
    "stylelint-config-recommended-vue",
    "stylelint-config-standard",
    "stylelint-config-standard-scss",

    // Installed to mirror a managed app's dependency list, but nothing in this
    // configuration loads them: the bundled prettier config declares no
    // \`plugins\`, and @commitlint/cli belongs to the managed commitlint app.
    // Debt, not blindness — they are here until someone decides whether the
    // managed apps should keep offering them at all.
    "@commitlint/cli",
    "@prettier/plugin-xml",
    "prettier-plugin-embed",
    "prettier-plugin-jsdoc",
    "prettier-plugin-sql",

    // Unused: nothing under apps/eslint/plugins/ registers them, and no rule of
    // theirs appears in src/lint-rules or in the committed rule inventory.
    // Parked rather than removed because dropping one also means editing
    // apps/eslint.deps.ts and regenerating the eslint app's pinned lockFile.
    // Two exceptions to that reasoning: eslint-plugin-es-x is only unused as a
    // *direct* pin — eslint-plugin-n resolves its own copy for
    // n/no-unsupported-features/es-syntax, so its rules do run; and
    // eslint-typegen is absent from apps/eslint.deps.ts, so removing it needs no
    // lockFile regeneration at all. It survives only in a commented-out import
    // in scripts/eslint-typegen.ts.
    "eslint-plugin-baseline-js",
    "eslint-plugin-decorator-position",
    "eslint-plugin-es-x",
    "eslint-plugin-functional",
    "eslint-plugin-json",
    "eslint-typegen",
  ],

  ignoreIssues: {
    ...prev.ignoreIssues,
    // The pnpm catalog duplicates versions that datamitsu.config.ts states as
    // literals, and nothing references \`catalog:\` — a real finding, but fixing
    // it is a decision about how this repository pins dependencies. Nothing
    // gates it today: \`task validate:pins\` compares datamitsu.config.ts against
    // package.json and never looks at the catalog.
    "pnpm-workspace.yaml": ["catalog"],

    // Generated surfaces, here and in the three files below. Their generators
    // emit a complete set — every chunk and skill hash — while datamitsu.config.ts
    // imports only the content exports beside them. Debt in the generators, not
    // something knip is failing to see.
    "src/**/*.generated.ts": ["exports", "types"],

    // A vocabulary of file-type globs, deliberately complete: a plugin added
    // later needs the glob to already exist, and the set is what makes the
    // scoping decisions in apps/eslint/index.ts readable.
    "src/apps/eslint/globs.ts": ["exports"],

    "src/datamitsu-config/agents.md.ts": ["exports"],
    "src/datamitsu-config/skills.ts": ["exports"],
    "src/datamitsu-config/tsconfig.md.ts": ["exports"],
  },

  // knip resolves a script's paths against the file that names it, so
  // \`bin/datamitsu.js\` in a package.json script is looked for under scripts/;
  // the s0 one is written relative to the bundle in dist/, not to its source.
  ignoreUnresolved: [...(prev.ignoreUnresolved ?? []), "bin/datamitsu.js", "../../bin/datamitsu.js"],
}));
`,
      expectChainHash: "xxh3:3367bb8a2b161dfca86bb5eaf61bb486",
    },
    "lefthook.yaml": {
      ...config.managedConfigs?.["lefthook.yaml"],
      content: () => /*yaml*/ `glob_matcher: doublestar
pre-commit:
  commands:
    datamitsu-init:
      priority: 10
      run: node bin/datamitsu.js init
    sync-datamitsu-version:
      priority: 20
      run: "node bin/datamitsu.js exec task -- sync:datamitsu-version && node bin/datamitsu.js exec task -- docker:generate && git add datamitsu.config.ts src/datamitsu-config/datamitsu.config.ts src/datamitsu-config/parsers.ts docker/Dockerfile docker/Dockerfile.alpine docker/oci-map.json docker/oci-map.alpine.json"
      stage_fixed: true
    docs-generate:
      priority: 30
      run: "node bin/datamitsu.js exec task -- docs:generate && git add docs/reference/apps.md docs/reference/tools.md docs/reference/project-types.md docs/reference/managed-configs.md"
      stage_fixed: true
    datamitsu-check:
      priority: 40
      run: node bin/datamitsu.js check --file-scoped
      stage_fixed: true
    build:
      priority: 50
      run: "node bin/datamitsu.js exec task -- build"
      stage_fixed: false
    validate-blocklist:
      priority: 100
      run: "node bin/datamitsu.js exec task -- validate:blocklist"
      stage_fixed: false
    validate-parsers:
      priority: 105
      run: "node bin/datamitsu.js exec task -- validate:parsers"
      stage_fixed: false
    validate-rule-inventory:
      priority: 110
      run: "node bin/datamitsu.js exec task -- validate:rule-inventory"
      stage_fixed: false
    test:
      priority: 200
      run: pnpm test
  parallel: false
commit-msg:
  commands:
    lint commit message:
      run: "node bin/datamitsu.js exec commitlint -- --edit {1}"
post-checkout:
  commands:
    init datamitsu:
      priority: 2
      run: node bin/datamitsu.js init
    install deps:
      priority: 1
      run: pnpm i -y
  parallel: false
    `,
      expectChainHash: "xxh3:1124e9bc6be737f22c501e7582f6fbda",
    },
    "package.json": {
      ...config.managedConfigs?.["package.json"],
      content: () => {
        return (
          JSON.stringify(
            {
              author: "Alexander Svinarev <shibanet0@gmail.com> (shibanet0.com)",
              bin: {
                datamitsu: "bin/datamitsu.js",
                dm: "bin/datamitsu.js",
                s0: "bin/s0.js",
                tsc: "bin/tsc.js",
                tsx: "bin/tsx.js",
              },
              dependencies: {
                "@commander-js/extra-typings": "14.0.0",
                "@datamitsu/datamitsu": "0.0.0-unstable.20260919.92e886b",
                commander: "14.0.3",
                execa: "9.6.1",
                "fast-glob": "3.3.3",
                tsx: "4.22.3",
                "type-fest": "5.6.0",
                typescript: "6.0.3",
              },
              description: "Shared datamitsu configuration with 79+ managed development tools",
              devDependencies: {
                "@antebudimir/eslint-plugin-vanilla-extract": "1.17.0",
                "@commitlint/cli": "21.2.2",
                "@commitlint/config-conventional": "21.2.2",
                "@commitlint/format": "21.2.2",
                "@commitlint/types": "21.2.0",
                "@e18e/eslint-plugin": "0.8.0",
                "@eslint-community/eslint-plugin-eslint-comments": "4.7.2",
                "@eslint-react/eslint-plugin": "5.18.6",
                "@eslint/config-helpers": "0.7.0",
                "@eslint/js": "10.0.1",
                "@next/eslint-plugin-next": "16.3.2",
                "@ovineko/clean-pkg-json": "0.0.4",
                "@prettier/plugin-xml": "3.4.2",
                "@stylistic/eslint-plugin": "5.10.0",
                "@types/node": "25.9.1",
                "@types/remove-markdown": "0.3.4",
                // Not plugins. Two packages that import them at runtime without declaring either a
                // dependency or a peer — @antebudimir/eslint-plugin-vanilla-extract needs
                // @typescript-eslint/utils, eslint-plugin-compat needs caniuse-lite — so under
                // pnpm's isolated layout they only ever resolved by accident.
                "@typescript-eslint/utils": "8.67.0",
                "@vitest/coverage-v8": "4.1.7",
                "@vitest/eslint-plugin": "1.6.27",
                "caniuse-lite": "1.0.30001760",
                "conventional-changelog-conventionalcommits": "10.4.0",
                cspell: "10.0.1",
                eslint: "10.9.0",
                "eslint-config-prettier": "10.1.8",
                "eslint-flat-config-utils": "3.2.0",
                "eslint-import-resolver-typescript": "4.4.5",
                "eslint-plugin-array-func": "5.1.1",
                "eslint-plugin-baseline-js": "0.7.1",
                "eslint-plugin-boundaries": "7.2.0",
                "eslint-plugin-clsx": "0.1.0",
                "eslint-plugin-command": "4.0.0",
                "eslint-plugin-compat": "7.0.2",
                "eslint-plugin-de-morgan": "2.1.3",
                "eslint-plugin-decorator-position": "6.1.1",
                "eslint-plugin-depend": "1.5.0",
                "eslint-plugin-es-x": "10.0.0",
                "eslint-plugin-escompat": "3.11.4",
                "eslint-plugin-fsecond": "1.5.0",
                "eslint-plugin-functional": "10.0.0",
                "eslint-plugin-html": "8.1.4",
                "eslint-plugin-i18next": "6.1.5",
                "eslint-plugin-import-x": "4.17.1",
                "eslint-plugin-jsdoc": "64.2.1",
                "eslint-plugin-json": "5.0.0",
                "eslint-plugin-json-schema-validator": "6.3.1",
                "eslint-plugin-jsonc": "3.4.1",
                "eslint-plugin-jsx-a11y-x": "0.2.0",
                "eslint-plugin-n": "18.3.0",
                "eslint-plugin-no-unsanitized": "4.1.5",
                "eslint-plugin-no-use-extend-native": "0.7.3",
                "eslint-plugin-oxlint": "1.79.0",
                "eslint-plugin-perfectionist": "5.10.1",
                "eslint-plugin-playwright": "2.11.0",
                "eslint-plugin-pnpm": "1.8.0",
                "eslint-plugin-promise": "7.3.0",
                "eslint-plugin-react-hooks": "7.1.1",
                "eslint-plugin-react-prefer-function-component": "5.0.0",
                "eslint-plugin-react-refresh": "0.5.4",
                "eslint-plugin-react-you-might-not-need-an-effect": "1.0.2",
                "eslint-plugin-regexp": "3.2.0",
                "eslint-plugin-security": "4.0.1",
                "eslint-plugin-sonarjs": "4.2.0",
                "eslint-plugin-storybook": "10.5.10",
                "eslint-plugin-svelte": "3.23.0",
                "eslint-plugin-turbo": "2.10.11",
                "eslint-plugin-unicorn": "73.0.0",
                "eslint-plugin-unused-imports": "4.4.1",
                "eslint-typegen": "2.3.1",
                globals: "17.11.0",
                "json-schema-to-typescript": "15.0.4",
                knip: "6.32.2",
                oxfmt: "0.64.0",
                oxlint: "1.79.0",
                prettier: "3.9.6",
                "prettier-plugin-embed": "0.5.1",
                "prettier-plugin-jsdoc": "1.8.1",
                "prettier-plugin-sql": "0.20.0",
                "remove-markdown": "0.6.4",
                stylelint: "17.15.0",
                svelte: "5.57.0",
                tsdown: "0.22.14",
                "typescript-eslint": "8.67.0",
                unrun: "0.3.0",
                vitest: "4.1.7",
                yaml: "2.9.0",
              },
              devEngines: {
                runtime: {
                  name: "node",
                  onFail: "warn",
                  version: ">=26.8.1",
                },
              },
              engines: {
                node: ">=22.12.0",
              },
              exports: {
                ".": {
                  default: "./dist/datamitsu-api/index.js",
                  types: "./dist/datamitsu-api/index.d.ts",
                },
                "./package.json": "./package.json",
                "./tsconfig/base.json": "./tsconfig/base.json",
                "./tsconfig/infra-pulumi.json": "./tsconfig/infra-pulumi.json",
                "./tsconfig/library.json": "./tsconfig/library.json",
                "./tsconfig/nextjs.json": "./tsconfig/nextjs.json",
                "./tsconfig/react-library.json": "./tsconfig/react-library.json",
                "./tsconfig/service-worker.json": "./tsconfig/service-worker.json",
                "./tsconfig/service.json": "./tsconfig/service.json",
                "./tsconfig/shared-library.json": "./tsconfig/shared-library.json",
                "./tsconfig/shared-react-library.json": "./tsconfig/shared-react-library.json",
                "./type-fest": {
                  import: {
                    types: "./dist/type-fest/index.d.ts",
                  },
                },
                "./type-fest/globals": {
                  import: {
                    types: "./dist/type-fest/globals/index.d.ts",
                  },
                },
              },
              files: [
                "datamitsu.config.base.js",
                "datamitsu.config.js",
                "datamitsu.config.oci-ghcr.js",
                "datamitsu.config.oci-dockerhub.js",
                "datamitsu.config.d.ts",
                "tsconfig/**",
                "dist/**",
                "bin/**",
              ],
              keywords: [],
              license: "MIT",
              name: "@shibanet0/datamitsu-config",
              packageManager: "pnpm@12.4.1",
              repository: {
                type: "git",
                url: "https://github.com/shibanet0/datamitsu-config",
              },
              scripts: {
                build: "./node_modules/.bin/datamitsu --no-auto-config exec task -- build",
                "build:local":
                  "pnpm run build && cp ./datamitsu.config.base.js ~/ghq/github.com/datamitsu/datamitsu/node_modules/@shibanet0/datamitsu-config/datamitsu.config.js",
                datamitsu:
                  'DATAMITSU_DEV_MODE=true DATAMITSU_PACKAGE_NAME="./dist" bin/datamitsu.js --binary-command "node bin/datamitsu.js"',
                dm: "pnpm --silent datamitsu",
                "docker:build":
                  "pnpm run docker:build:amd64 && pnpm run docker:build:alpine:amd64 && pnpm run docker:build:arm64 && pnpm run docker:build:alpine:arm64",
                "docker:build:alpine:amd64":
                  "pnpm run docker:builder && node scripts/docker-build.ts alpine:amd64",
                "docker:build:alpine:arm64":
                  "pnpm run docker:builder && node scripts/docker-build.ts alpine:arm64",
                "docker:build:amd64":
                  "pnpm run docker:builder && node scripts/docker-build.ts amd64",
                "docker:build:arm64":
                  "pnpm run docker:builder && node scripts/docker-build.ts arm64",
                "docker:builder":
                  "docker buildx inspect dm-config-local >/dev/null 2>&1 || docker buildx create --name dm-config-local --driver docker-container --driver-opt network=host --config docker/buildkitd.toml --bootstrap",
                postpack: "clean-pkg-json restore && rm -f datamitsu.config.js",
                prepack:
                  "pnpm build && cp datamitsu.config.base.js datamitsu.config.js && clean-pkg-json clean",
                prepare: "pnpm build && pnpm datamitsu init",
                test: "vitest run",
                "test:coverage": "vitest run --coverage",
                "test:update": "vitest run --update",
                "test:watch": "vitest watch",
              },
              type: "module",
              version: "0.0.3-alpha-28",
            },
            null,
            2,
          ) + "\n"
        );
      },
      expectChainHash: "xxh3:2f2bce8c164ed347a933bf3522f8e3a9",
    },
    "pnpm-workspace.yaml": {
      ...config.managedConfigs?.["pnpm-workspace.yaml"],
      content: () => /*yaml*/ `allowBuilds:
  esbuild: false
  unrs-resolver: false
audit: {}
auditLevel: high
autoInstallPeers: true
blockExoticSubdeps: true
catalog:
  "@antebudimir/eslint-plugin-vanilla-extract": 1.17.0
  "@commander-js/extra-typings": 14.0.0
  "@commitlint/cli": 21.2.2
  "@commitlint/config-conventional": 21.2.2
  "@commitlint/format": 21.2.2
  "@commitlint/types": 21.2.0
  "@datamitsu/datamitsu": 0.2.2
  "@e18e/eslint-plugin": 0.8.0
  "@eslint-community/eslint-plugin-eslint-comments": 4.7.2
  "@eslint-react/eslint-plugin": 5.18.6
  "@eslint/config-helpers": 0.7.0
  "@eslint/js": 10.0.1
  "@next/eslint-plugin-next": 16.3.2
  "@ovineko/clean-pkg-json": 0.0.4
  "@prettier/plugin-xml": 3.4.2
  "@stylistic/eslint-plugin": 5.10.0
  "@types/node": 25.9.1
  "@types/remove-markdown": 0.3.4
  "@typescript-eslint/utils": 8.67.0
  "@vitest/coverage-v8": 4.1.7
  "@vitest/eslint-plugin": 1.6.27
  caniuse-lite: 1.0.30001760
  commander: 14.0.3
  conventional-changelog-conventionalcommits: 10.4.0
  cspell: 10.0.1
  eslint: 10.9.0
  eslint-config-prettier: 10.1.8
  eslint-flat-config-utils: 3.2.0
  eslint-import-resolver-typescript: 4.4.5
  eslint-plugin-array-func: 5.1.1
  eslint-plugin-baseline-js: 0.7.1
  eslint-plugin-boundaries: 7.2.0
  eslint-plugin-clsx: 0.1.0
  eslint-plugin-command: 4.0.0
  eslint-plugin-compat: 7.0.2
  eslint-plugin-de-morgan: 2.1.3
  eslint-plugin-decorator-position: 6.1.1
  eslint-plugin-depend: 1.5.0
  eslint-plugin-es-x: 10.0.0
  eslint-plugin-escompat: 3.11.4
  eslint-plugin-fsecond: 1.5.0
  eslint-plugin-functional: 10.0.0
  eslint-plugin-html: 8.1.4
  eslint-plugin-i18next: 6.1.5
  eslint-plugin-import-x: 4.17.1
  eslint-plugin-jsdoc: 64.2.1
  eslint-plugin-json: 5.0.0
  eslint-plugin-json-schema-validator: 6.3.1
  eslint-plugin-jsonc: 3.4.1
  eslint-plugin-jsx-a11y-x: 0.2.0
  eslint-plugin-n: 18.3.0
  eslint-plugin-no-unsanitized: 4.1.5
  eslint-plugin-no-use-extend-native: 0.7.3
  eslint-plugin-oxlint: 1.79.0
  eslint-plugin-perfectionist: 5.10.1
  eslint-plugin-playwright: 2.11.0
  eslint-plugin-pnpm: 1.8.0
  eslint-plugin-promise: 7.3.0
  eslint-plugin-react-hooks: 7.1.1
  eslint-plugin-react-prefer-function-component: 5.0.0
  eslint-plugin-react-refresh: 0.5.4
  eslint-plugin-react-you-might-not-need-an-effect: 1.0.2
  eslint-plugin-regexp: 3.2.0
  eslint-plugin-security: 4.0.1
  eslint-plugin-sonarjs: 4.2.0
  eslint-plugin-storybook: 10.5.10
  eslint-plugin-svelte: 3.23.0
  eslint-plugin-turbo: 2.10.11
  eslint-plugin-unicorn: 73.0.0
  eslint-plugin-unused-imports: 4.4.1
  eslint-typegen: 2.3.1
  execa: 9.6.1
  fast-glob: 3.3.3
  globals: 17.11.0
  json-schema-to-typescript: 15.0.4
  knip: 6.32.2
  oxfmt: 0.64.0
  oxlint: 1.79.0
  prettier: 3.9.6
  prettier-plugin-embed: 0.5.1
  prettier-plugin-jsdoc: 1.8.1
  prettier-plugin-sql: 0.20.0
  remove-markdown: 0.6.4
  stylelint: 17.15.0
  svelte: 5.57.0
  tsdown: 0.22.14
  tsx: 4.22.3
  type-fest: 5.6.0
  typescript: 6.0.3
  typescript-eslint: 8.67.0
  unrun: 0.3.0
  vitest: 4.1.7
  yaml: 2.9.0
dangerouslyAllowAllBuilds: false
dedupeDirectDeps: true
dedupePeerDependents: true
enableGlobalVirtualStore: true
enablePrePostScripts: false
engineStrict: true
hoistPattern: []
lockfile: true
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - "@datamitsu/*"
  - "@ovineko/*"
optimisticRepeatInstall: true
overrides:
  debug@4.4.3: npm:debug@3.2.7
packageExtensions:
  # Both packages import these at runtime and declare neither a dependency nor a peer on them, so
  # under pnpm's isolated layout they simply cannot resolve. They only ever worked by accident,
  # through whatever else happened to drag the package into the tree — which is why enabling the
  # plugins surfaced a crash rather than a lint result.
  "@antebudimir/eslint-plugin-vanilla-extract":
    dependencies:
      "@typescript-eslint/utils": "*"
  eslint-plugin-compat:
    dependencies:
      caniuse-lite: "*"
preferFrozenLockfile: true
resolutionMode: lowest-direct
savePrefix: ""
strictDepBuilds: true
strictSsl: true
trustLockfile: true
trustPolicy: no-downgrade
trustPolicyExclude:
  - semver@6.3.1
unsafePerm: false
updateNotifier: false
verifyDepsBeforeRun: install
verifyStoreIntegrity: true
`,
      expectChainHash: "xxh3:7edd11a2c000f70ef0b8f6cedb35abe9",
    },
  },
  tools: {
    ...config.tools,
    alint: {
      ...config.tools!["alint"]!,
      skip: false,
    },
    "ls-lint": {
      ...config.tools!["ls-lint"]!,
      skip: false,
    },
  },
});
globalThis.getConfig = _getConfig;

const _getMinVersion = () => "0.0.0";
globalThis.getMinVersion = _getMinVersion;

const cspellWords: string[] = [
  // The dotfile browserslist reads, named in the comment that explains why `compat` and `escompat`
  // are gated on the manifest field instead.
  "browserslistrc",
  "datetimez",
  // Plural of the shell glob form `?(a|b)`, which `toOxlintIgnorePatterns` expands because oxlint's
  // matcher has no extglob support.
  "extglobs",
  "frontmatter",
  "triaging",
  "errmsg",
  "flynt",
  "perflint",
  "pygrep",
  "pyupgrade",
  "tryceratops",
  "yesqa",
  "softprops",
  "amannn",
  "footgun",
  "slugified",
  "footguns",
  "goja",
  "unrs",
  "tfupdate",
  "minamijoyo",
  "hclfmt",
  "ktfmt",
  "alphabetised",
  "summarise",
  "initialising",
  "govulncheck",
  "GOPATH",
  "depguard",
  "hashutil",
  "forbidigo",
  "gosec",
  "wrapcheck",
  "asciicheck",
  "asasalint",
  "arangolint",
  "bidichk",
  "bodyclose",
  "canonicalheader",
  "clickhouselint",
  "containedctx",
  "contextcheck",
  "copyloopvar",
  "decoder",
  "dupword",
  "durationcheck",
  "embeddedstructfieldcheck",
  "errcheck",
  "errchkjson",
  "errorlint",
  "exptostd",
  "fatcontext",
  "forcetypeassert",
  "funcorder",
  "gocheckcompilerdirectives",
  "gochecksumtype",
  "gocritic",
  "gocyclo",
  "godoclint",
  "gomoddirectives",
  "gomodguard",
  "goprintffuncname",
  "govet",
  "ginkgolinter",
  "imports",
  "inamedparam",
  "ineffassign",
  "interfacebloat",
  "intrange",
  "iotamixing",
  "loggercheck",
  "makezero",
  "musttag",
  "nakedret",
  "nilerr",
  "nilnesserr",
  "nilnil",
  "noctx",
  "nolintlint",
  "nosprintfhostport",
  "perfsprint",
  "prealloc",
  "predeclared",
  "promlinter",
  "protogetter",
  "recvcheck",
  "rowserrcheck",
  "sloglint",
  "spancheck",
  "sqlclosecheck",
  "staticcheck",
  "tagalign",
  "testableexamples",
  "testifylint",
  "thelper",
  "tparallel",
  "unconvert",
  "unparam",
  "unqueryvet",
  "usestdlibvars",
  "usetesting",
  "wastedassign",
  "zerologlint",
  "cyclop",
  "dupl",
  "exhaustruct",
  "funlen",
  "gochecknoglobals",
  "gochecknoinits",
  "gocognit",
  "goconst",
  "godox",
  "goheader",
  "gosmopolitan",
  "ireturn",
  "maintidx",
  "nestif",
  "nlreturn",
  "noinlineerr",
  "nonamedreturns",
  "paralleltest",
  "testpackage",
  "varnamelen",
  "errorf",
  "gofmt",
  "gofumpt",
  "goimports",
  "decorder",
  "importas",
  "Dockerfiles",
  "zstd",
  "klauspost",
  "mediatypes",
  "buildkitd",
  "buildx",
  "ustar",
  "typeflag",
  "airgap",
  "oras",
  "skopeo",
  "cdef",
  "noci",
  "dockerhub",
  "endgroup",
  "chgrp",
  "bierner",
  "postpack",
  "jscowsay",
  "pycowsay",
  "ldflag",
  "runtimeconfig",
  "Kysely",
  "sqlc",
  "ELIFECYCLE",
  // Rule names that appear in the generated src/lint-rules/rule-inventory.json: environment names
  // from `globals`, and the deliberate misspellings that typo-detection rules are named after.
  "applescript",
  "atomtest",
  "autofixers",
  "bject",
  "destructurings",
  "duplicative",
  "embertest",
  "esmodule",
  "formart",
  "gnored",
  "mymethod",
  "nashorn",
  "prototypejs",
  "rray",
  "serviceworker",
  "strnig",
  "thenables",
  "canparse",
  "charcode",
  "lookarounds",
  "extensionless",

  "classlist",
  "categorises",
  "severitied",
  "proptypes",
  "polyfillio",
  "nonconstructor",
  "nonoctal",
  "misrefactored",
  "uninvoked",
  "textnodes",
  "innerhtml",
  "multilines",
  "chunkname",
  "backet",
  "networkidle",
  "flowtype",
  "opensearchservice",
  "httponly",
  "mischeck",
  "incdec",
  "unthrown",

  // knip's cache directory under {toolCache}, and the package it resolves a
  // formatter through for `--fix --format` — both named in the Knip section.
  "knipcache",
  "Formatly",

  // Extensionless tool configs, named in the knip operation's comment as
  // examples of inputs an enumerated glob list cannot cover.
  "swcrc",
  "graphqlrc",
];
