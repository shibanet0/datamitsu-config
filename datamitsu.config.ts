/// <reference path="./.datamitsu/datamitsu.config.d.ts" />

const _getConfig = (config: config.Config): config.Config => ({
  ...config,
  setup: {
    ...config.setup,
    "cspell.config.mjs": {
      ...config.setup?.["cspell.config.mjs"],
      content: () => /* js */ `import { defineConfig } from "./.datamitsu/cspell.config.mjs";

export default defineConfig((prev) => {
  const words = ${JSON.stringify(cspellWords, null, 2)};

  return ({
  ...prev,
  words: [
    ...(prev.words || []),
    ...words
  ],
})});
`,
      expectChainHash: "xxh3:84e8fe2861e794390eb299da516f3d4b",
    },
    "eslint.config.mjs": {
      ...config.setup?.["eslint.config.mjs"],
      content: () => /* js */ `import { globalIgnores } from "@eslint/config-helpers";
import { join } from "node:path";

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
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
      react: {
        version: "19.2.3",
      },
    },
    react: true,
  },
);

export default [
  globalIgnores([".datamitsu/"]),
  ...config,
  {
    rules: {
      "playwright/no-standalone-expect": "off",
      "unicorn/no-object-as-default-parameter": "off",
    },
  },
];
`,
      expectChainHash: "xxh3:7d316c3fb6014fdcb5991a9d506385af",
    },
    "knip.config.js": {
      ...config.setup?.["knip.config.js"],
      content: () => /* js */ `import { defineConfig } from "./.datamitsu/knip.config.js";

export default defineConfig((prev) => ({
  ...prev,
  ignoreBinaries: ["bin/datamitsu.js"],
  ignoreDependencies: [
    "@e18e/eslint-plugin",
    "@commitlint/cli",
    "syncpack",
    "type-fest",
    "@octokit/rest",
    "publint",
    "sort-package-json",
    "eslint-config-prettier",
    "eslint-plugin-array-func",
    "eslint-plugin-import",
    "eslint-plugin-json",
    "eslint-plugin-json-schema-validator",
    "eslint-plugin-jsx-a11y",
    "eslint-plugin-n",
    "eslint-plugin-no-use-extend-native",
    "eslint-plugin-perfectionist",
    "eslint-plugin-playwright",
    "eslint-plugin-promise",
    "eslint-plugin-react",
    "eslint-plugin-react-hooks",
    "eslint-plugin-react-perf",
    "prettier-plugin-embed",
    "prettier-plugin-jsdoc",
    "prettier-plugin-sql",
    "eslint-plugin-react-prefer-function-component",
    "eslint-plugin-react-refresh",
    "eslint-plugin-security",
    "eslint-plugin-sonarjs",
    "eslint-plugin-storybook",
    "eslint-plugin-turbo",
    "@prettier/plugin-xml",
    "eslint-plugin-unicorn",
    "eslint-plugin-unused-imports",
    "@antebudimir/eslint-plugin-vanilla-extract",
  ],
}));
`,
      expectChainHash: "xxh3:3367bb8a2b161dfca86bb5eaf61bb486",
    },
    "lefthook.yaml": {
      ...config.setup?.["lefthook.yaml"],
      content: () => /*yaml*/ `commit-msg:
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
pre-commit:
  commands:
    datamitsu-check:
      priority: 5
      run: node bin/datamitsu.js check --file-scoped
      stage_fixed: true
    datamitsu-init:
      priority: 1
      run: node bin/datamitsu.js init
    docs-generate:
      priority: 3
      run: node bin/datamitsu.js exec task -- docs:generate && git add docs/reference/apps.md docs/reference/tools.md docs/reference/project-types.md docs/reference/setup-configs.md
      stage_fixed: true
    sync-datamitsu-version:
      priority: 2
      run: node bin/datamitsu.js exec task -- sync:datamitsu-version && git add docker/Dockerfile docker/Dockerfile.alpine src/datamitsu-config/datamitsu.config.ts
      stage_fixed: true
    test:
      priority: 6
      run: pnpm test
    validate-blocklist:
      priority: 4
      run: node bin/datamitsu.js exec task -- validate:blocklist
      stage_fixed: false
  parallel: false
    `,
      expectChainHash: "xxh3:70a3cb2247a663d2d73391ea7100e41e",
    },
    "package.json": {
      ...config.setup?.["package.json"],
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
                "@datamitsu/datamitsu": "0.1.10",
                commander: "14.0.3",
                execa: "9.6.1",
                "fast-glob": "3.3.3",
                tsx: "4.22.3",
                "type-fest": "5.6.0",
                typescript: "6.0.3",
              },
              description: "Shared datamitsu configuration with 79+ managed development tools",
              devDependencies: {
                "@antebudimir/eslint-plugin-vanilla-extract": "1.16.0",
                "@commitlint/cli": "21.0.1",
                "@commitlint/config-conventional": "21.0.1",
                "@commitlint/format": "21.0.1",
                "@commitlint/types": "21.0.1",
                "@e18e/eslint-plugin": "0.3.0",
                "@eslint/config-helpers": "0.5.2",
                "@eslint/js": "9.39.2",
                "@next/eslint-plugin-next": "16.1.6",
                "@ovineko/clean-pkg-json": "0.0.4",
                "@prettier/plugin-xml": "3.4.2",
                "@stylistic/eslint-plugin": "5.8.0",
                "@types/eslint-plugin-jsx-a11y": "6.10.1",
                "@types/node": "25.9.1",
                "@types/remove-markdown": "0.3.4",
                "@vitest/coverage-v8": "4.1.7",
                "@vitest/eslint-plugin": "1.6.9",
                "conventional-changelog-conventionalcommits": "9.3.1",
                cspell: "10.0.0",
                eslint: "9.39.2",
                "eslint-config-prettier": "10.1.8",
                "eslint-flat-config-utils": "3.0.1",
                "eslint-import-resolver-typescript": "4.4.4",
                "eslint-plugin-array-func": "5.1.0",
                "eslint-plugin-arrow-return-style": "1.3.1",
                "eslint-plugin-baseline-js": "0.5.0",
                "eslint-plugin-boundaries": "5.4.0",
                "eslint-plugin-clsx": "0.0.12",
                "eslint-plugin-command": "3.4.0",
                "eslint-plugin-compat": "6.1.0",
                "eslint-plugin-de-morgan": "2.0.0",
                "eslint-plugin-decorator-position": "6.0.0",
                "eslint-plugin-depend": "1.4.0",
                "eslint-plugin-es-x": "9.4.0",
                "eslint-plugin-escompat": "3.11.4",
                "eslint-plugin-eslint-comments": "3.2.0",
                "eslint-plugin-filenames": "1.3.2",
                "eslint-plugin-fsecond": "1.4.0",
                "eslint-plugin-functional": "9.0.2",
                "eslint-plugin-html": "8.1.4",
                "eslint-plugin-i18next": "6.1.3",
                "eslint-plugin-import": "2.32.0",
                "eslint-plugin-jsdoc": "62.6.0",
                "eslint-plugin-json": "4.0.1",
                "eslint-plugin-json-schema-validator": "6.0.3",
                "eslint-plugin-jsonc": "2.21.1",
                "eslint-plugin-jsx-a11y": "6.10.2",
                "eslint-plugin-n": "17.24.0",
                "eslint-plugin-no-unsanitized": "4.1.4",
                "eslint-plugin-no-use-extend-native": "0.7.2",
                "eslint-plugin-oxlint": "1.58.0",
                "eslint-plugin-perfectionist": "5.5.0",
                "eslint-plugin-playwright": "2.6.0",
                "eslint-plugin-pnpm": "1.5.0",
                "eslint-plugin-promise": "7.2.1",
                "eslint-plugin-react": "7.37.5",
                "eslint-plugin-react-hooks": "7.0.1",
                "eslint-plugin-react-perf": "3.3.3",
                "eslint-plugin-react-prefer-function-component": "5.0.0",
                "eslint-plugin-react-refresh": "0.5.0",
                "eslint-plugin-react-you-might-not-need-an-effect": "0.9.1",
                "eslint-plugin-regexp": "3.0.0",
                "eslint-plugin-security": "3.0.1",
                "eslint-plugin-sonarjs": "3.0.5",
                "eslint-plugin-storybook": "10.2.9",
                "eslint-plugin-turbo": "2.8.9",
                "eslint-plugin-unicorn": "63.0.0",
                "eslint-plugin-unused-imports": "4.4.1",
                "eslint-typegen": "2.3.0",
                globals: "17.3.0",
                "json-schema-to-typescript": "15.0.4",
                knip: "6.14.1",
                oxfmt: "0.52.0",
                oxlint: "1.58.0",
                prettier: "3.8.3",
                "prettier-plugin-embed": "0.5.1",
                "prettier-plugin-jsdoc": "1.8.0",
                "prettier-plugin-sql": "0.20.0",
                "remove-markdown": "0.6.4",
                tsdown: "0.22.0",
                "typescript-eslint": "8.56.0",
                unrun: "0.3.0",
                vitest: "4.1.7",
              },
              devEngines: {
                runtime: {
                  name: "node",
                  onFail: "warn",
                  version: ">=26.3.0",
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
              packageManager: "pnpm@11.5.0",
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
                  "pnpm run docker:builder && docker buildx build --builder dm-config-local --platform linux/amd64 -f docker/Dockerfile.alpine -t datamitsu-config:local-alpine-amd64 --load .",
                "docker:build:alpine:arm64":
                  "pnpm run docker:builder && docker buildx build --builder dm-config-local --platform linux/arm64 -f docker/Dockerfile.alpine -t datamitsu-config:local-alpine-arm64 --load .",
                "docker:build:amd64":
                  "pnpm run docker:builder && docker buildx build --builder dm-config-local --platform linux/amd64 -f docker/Dockerfile -t datamitsu-config:local-amd64 --load .",
                "docker:build:arm64":
                  "pnpm run docker:builder && docker buildx build --builder dm-config-local --platform linux/arm64 -f docker/Dockerfile -t datamitsu-config:local-arm64 --load .",
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
      expectChainHash: "xxh3:cf1595c7ada06ad477c1feb8388a2030",
    },
    "pnpm-workspace.yaml": {
      ...config.setup?.["pnpm-workspace.yaml"],
      content: () => /*yaml*/ `allowBuilds:
  esbuild: false
  unrs-resolver: false
audit: true
auditLevel: high
autoInstallPeers: true
blockExoticSubdeps: true
dangerouslyAllowAllBuilds: false
dedupeDirectDeps: true
dedupePeerDependents: true
enableGlobalVirtualStore: true
enablePrePostScripts: false
engineStrict: true
hoistPattern: []
ignorePatchFailures: false
lockfile: true
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - "@datamitsu/*"
  - "@ovineko/*"
optimisticRepeatInstall: true
overrides:
  debug@4.4.3: npm:debug@3.2.7
packageManagerStrict: true
packageManagerStrictVersion: true
preferFrozenLockfile: true
resolutionMode: lowest-direct
savePrefix: ""
strictDepBuilds: true
strictSsl: true
trustLockfile: true
trustPolicy:
  allowDowngrade:
    - semver@6.3.1
unsafePerm: false
updateNotifier: false
verifyDepsBeforeRun: install
verifyStoreIntegrity: true
`,
      expectChainHash: "xxh3:a5cf1b92eb2ba85fc50c0cccb306c037",
    },
  },
});
globalThis.getConfig = _getConfig;

const _getMinVersion = () => "0.0.0";
globalThis.getMinVersion = _getMinVersion;

const cspellWords: string[] = [
  "datetimez",
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
];
