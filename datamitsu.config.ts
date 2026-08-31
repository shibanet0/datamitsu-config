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
    "yaml",
    "@octokit/rest",
    "publint",
    "sort-package-json",
    "eslint-config-prettier",
    "eslint-plugin-array-func",
    "eslint-plugin-import-x",
    "eslint-plugin-json",
    "eslint-plugin-json-schema-validator",
    "eslint-plugin-jsx-a11y-x",
    "eslint-plugin-n",
    "eslint-plugin-no-use-extend-native",
    "eslint-plugin-perfectionist",
    "eslint-plugin-playwright",
    "eslint-plugin-promise",
    "@eslint-react/eslint-plugin",
    "eslint-plugin-react-hooks",
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
      content: () => /*yaml*/ `glob_matcher: "doublestar"
pre-commit:
  commands:
    datamitsu-init:
      priority: 10
      run: node bin/datamitsu.js init
    sync-datamitsu-version:
      priority: 20
      run: "node bin/datamitsu.js exec task -- sync:datamitsu-version && git add docker/Dockerfile docker/Dockerfile.alpine src/datamitsu-config/datamitsu.config.ts"
      stage_fixed: true
    docs-generate:
      priority: 30
      run: "node bin/datamitsu.js exec task -- docs:generate && git add docs/reference/apps.md docs/reference/tools.md docs/reference/project-types.md docs/reference/setup-configs.md"
      stage_fixed: true
    datamitsu-check:
      priority: 40
      run: node bin/datamitsu.js check --file-scoped
      stage_fixed: true
    validate-blocklist:
      priority: 100
      run: "node bin/datamitsu.js exec task -- validate:blocklist"
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
      expectChainHash: "xxh3:44886d6a1d6cb1d51b18a626e13be783",
    },
    "package.json": {
      ...config.setup?.["package.json"],
      content: () => {
        return (
          JSON.stringify(
            {
              name: "@shibanet0/datamitsu-config",
              version: "0.0.3-alpha-28",
              description: "Shared datamitsu configuration with 79+ managed development tools",
              keywords: [],
              repository: {
                type: "git",
                url: "https://github.com/shibanet0/datamitsu-config",
              },
              license: "MIT",
              author: "Alexander Svinarev <shibanet0@gmail.com> (shibanet0.com)",
              type: "module",
              exports: {
                ".": {
                  types: "./dist/datamitsu-api/index.d.ts",
                  default: "./dist/datamitsu-api/index.js",
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
              bin: {
                datamitsu: "bin/datamitsu.js",
                dm: "bin/datamitsu.js",
                s0: "bin/s0.js",
                tsc: "bin/tsc.js",
                tsx: "bin/tsx.js",
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
                prepack:
                  "pnpm build && cp datamitsu.config.base.js datamitsu.config.js && clean-pkg-json clean",
                postpack: "clean-pkg-json restore && rm -f datamitsu.config.js",
                prepare: "pnpm build && pnpm datamitsu init",
                test: "vitest run",
                "test:coverage": "vitest run --coverage",
                "test:update": "vitest run --update",
                "test:watch": "vitest watch",
              },
              dependencies: {
                "@commander-js/extra-typings": "14.0.0",
                "@datamitsu/datamitsu": "0.2.1",
                commander: "14.0.3",
                execa: "9.6.1",
                "fast-glob": "3.3.3",
                tsx: "4.22.3",
                "type-fest": "5.6.0",
                typescript: "6.0.3",
              },
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
                "@vitest/coverage-v8": "4.1.7",
                "@vitest/eslint-plugin": "1.6.27",
                "conventional-changelog-conventionalcommits": "10.4.0",
                cspell: "10.0.1",
                eslint: "10.9.0",
                "eslint-config-prettier": "10.1.8",
                "eslint-flat-config-utils": "3.2.0",
                "eslint-import-resolver-typescript": "4.4.5",
                "eslint-plugin-array-func": "5.1.1",
                "eslint-plugin-arrow-return-style": "1.3.1",
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
                tsdown: "0.22.14",
                "typescript-eslint": "8.67.0",
                unrun: "0.3.0",
                vitest: "4.1.7",
                yaml: "2.9.0",
              },
              packageManager: "pnpm@11.22.0",
              engines: {
                node: ">=22.12.0",
              },
              devEngines: {
                runtime: {
                  name: "node",
                  onFail: "warn",
                  version: ">=26.8.1",
                },
              },
            },
            null,
            2,
          ) + "\n"
        );
      },
      expectChainHash: "xxh3:90ba5596b1288529fd2dd90de31b27b3",
    },
    "pnpm-workspace.yaml": {
      ...config.setup?.["pnpm-workspace.yaml"],
      content: () => /*yaml*/ `allowBuilds:
  esbuild: false
  unrs-resolver: false
audit: {}
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
      expectChainHash: "xxh3:d6e94a4265385700f8f98b13822382af",
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
  "ldflag",
  "runtimeconfig",
  "Kysely",
  "sqlc",
];
