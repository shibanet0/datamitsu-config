import type { PackageJson } from "type-fest";

import { name as packageJsonName, version as packageJsonVersion } from "../../package.json";
import { oxlintConfig } from "../apps/oxlint";
import { AGENTS_MD, upgradeAgentsReference } from "./agentsUpgrade";
import { runtimeVersions } from "./constants";
import { env } from "./env";
import { filterIgnore, ignoreGroups } from "./ignore";
import { vscodeExtensions, vscodeSettings } from "./int-config/vscode";
import fnmVersions from "./registries/fnmVersions.json";
import { REMOVED_SKILLS, SKILLS } from "./skills";
import { safeJsonParse } from "./utils";
import { cleanDependencies } from "./utils/cleanDependencies";

const yamlIgnore: string[] = ["pnpm-lock.yaml"];

const aiTools: config.MapOfConfigInit = {
  ".cursor/rules": {
    linkTarget: "../AGENTS.md",
    scope: "git-root",
  },
  ".cursorrules": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },
  ".github/copilot-instructions.md": {
    linkTarget: "../AGENTS.md",
    scope: "git-root",
  },
  ".windsurfrules": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },
  "AGENTS.md": {
    content: (context) => {
      // Prefer existingContent (reflects prior layer merge transformations),
      // fall back to originalContent (raw file from disk)
      const existing = context.existingContent ?? context.originalContent;
      if (existing) {
        return upgradeAgentsReference(existing);
      }

      // Fallback for new files (no existing content)
      return AGENTS_MD;
    },
    scope: "git-root",
  },
  "CLAUDE.md": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },
  "GEMINI.md": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },

  // Skills: Claude Code adapters
  ...Object.fromEntries(
    SKILLS.map((s) => [
      `.claude/skills/${s.name}/SKILL.md`,
      {
        content: () => s.adapters.claude,
        scope: "git-root" as const,
      },
    ]),
  ),

  // Skills: Codex CLI adapters
  ...Object.fromEntries(
    SKILLS.map((s) => [
      `.codex/prompts/${s.name}.md`,
      {
        content: () => s.adapters.codex,
        scope: "git-root" as const,
      },
    ]),
  ),

  // Cleanup adapters of removed skills
  ...(REMOVED_SKILLS.length > 0
    ? {
        "removed-skills-cleanup": {
          deleteOnly: true,
          otherFileNameList: REMOVED_SKILLS.flatMap((name) => [
            `.claude/skills/${name}/SKILL.md`,
            `.codex/prompts/${name}.md`,
          ]),
          scope: "git-root" as const,
        },
      }
    : {}),
};

export const trufflehogExcludePaths: string[] = [
  "(?:^|/)(?:package-lock\\.json|pnpm-lock\\.yaml|yarn\\.lock|npm-shrinkwrap\\.json|bun\\.lockb?|go\\.sum|Cargo\\.lock|poetry\\.lock|uv\\.lock|Pipfile\\.lock|Gemfile\\.lock|composer\\.lock|mix\\.lock|flake\\.lock|pubspec\\.lock|Podfile\\.lock)$",
  "(?:^|/)__snapshots__/",
  "(?:^|/)testdata/",
  "(?:^|/)fixtures?/",
  "\\.min\\.(?:js|css)$",
  "\\.bundle\\.(?:js|css)$",
];

function escapeRegExp(string: string): string {
  // oxlint-disable-next-line unicorn/prefer-string-replace-all
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const init: config.MapOfConfigInit = {
  ".dockerignore": {
    content: (context) => {
      const mergedRules = tools.Ignore.parse(
        [tools.Ignore.stringify(ignoreGroups), filterIgnore(context.originalContent || "")].join(
          "\n",
        ),
      );

      return tools.Ignore.stringify(mergedRules.groups, mergedRules.groupOrder) + "\n";
    },
    scope: "git-root",
  },
  ".editorconfig": {
    content: (context) => {
      // https://editorconfig.org
      // https://github.com/editorconfig/editorconfig/wiki/EditorConfig-Properties
      const existing = INI.toRecord(INI.parse(context.originalContent || ""));

      // const baseParams: Record<string, string> = {
      //   indent_style: "tab",
      //   indent_size: "2",
      //   end_of_line: "lf",
      //   charset: "utf-8",
      //   max_line_length: "120",
      //   insert_final_newline: "true",
      //   trim_trailing_whitespace: "true",
      // };

      const data: INI.SectionEntry[] = [
        {
          name: "DEFAULT",
          properties: { root: "true" },
        },
        {
          name: "*",
          properties: {
            charset: "utf8",
            end_of_line: "lf",
            indent_size: "2",
            insert_final_newline: "true",
            trim_trailing_whitespace: "true",
            ...existing["*"],
          },
        },
        // {
        //   name: "*",
        //   properties: { ...existing["*"], ...baseParams },
        // },
        // {
        //   name: "*.go",
        //   properties: {
        //     ...existing["*.go"],
        //     ...baseParams,
        //     indent_size: "2",
        //   },
        // },
        // {
        //   name: "*.{js,cjs,mjs,ts,cts,mts,tsx,ctsx,mtsx,scss}",
        //   properties: {
        //     ...existing["*.{js,cjs,mjs,ts,cts,mts,tsx,ctsx,mtsx,scss}"],
        //     ...baseParams,
        //     quote_type: "double",
        //   },
        // },
        // {
        //   name: "*.{kt,kts}",
        //   properties: {
        //     ...existing["*.{kt,kts}"],
        //     ...baseParams,
        //     indent_size: "2",
        //   },
        // },
        // {
        //   name: "*.md",
        //   properties: {
        //     ...existing["*.md"],
        //     indent_style: "space",
        //     trim_trailing_whitespace: "false",
        //   },
        // },
        {
          name: "GNUmakefile",
          properties: { indent_size: "2", indent_style: "tab", ...existing["GNUmakefile"] },
        },
        {
          name: "Makefile",
          properties: { indent_size: "2", indent_style: "tab", ...existing["Makefile"] },
        },
        // {
        //   name: "COMMIT_EDITMSG",
        //   properties: { ...existing["COMMIT_EDITMSG"], max_line_length: "0" },
        // },
        // {
        //   name: "*.{yml,yaml,json}",
        //   properties: {
        //     ...existing["*.{yml,json}"],
        //     indent_style: "space",
        //     indent_size: "2",
        //   },
        // },
      ];

      return INI.stringify(data);
    },
    scope: "git-root",
  },
  ".editorconfig-checker.json": {
    content: (context) => {
      const data = safeJsonParse(context.originalContent);

      return (
        JSON.stringify(
          {
            ...data,
            Disable: {
              ...data.Disable,
            },
          },
          null,
          2,
        ) + "\n"
      );
    },
    scope: "git-root",
  },
  ".gitignore": {
    content: (context) => {
      const mergedRules = tools.Ignore.parse(
        [tools.Ignore.stringify(ignoreGroups), filterIgnore(context.originalContent || "")].join(
          "\n",
        ),
      );

      return tools.Ignore.stringify(mergedRules.groups, mergedRules.groupOrder) + "\n";
    },
    scope: "git-root",
  },
  ".gitleaks.toml": {
    content: (context) => {
      const data = TOML.parse(context.originalContent || "");

      const MANAGED_EXTEND_PATH = ".datamitsu/gitleaks-managed.toml";

      // oxlint-disable-next-line unicorn/consistent-function-scoping
      const isPlainObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value);

      const existingExtend: Record<string, unknown> = isPlainObject(data.extend) ? data.extend : {};

      // Seed a title only if the user hasn't set one. Preserve whatever they typed.
      const title: string =
        typeof data.title === "string" && data.title.length > 0
          ? data.title
          : "Custom Gitleaks configuration";

      return TOML.stringify({
        ...data,
        extend: {
          ...existingExtend,
          path: MANAGED_EXTEND_PATH,
        },
        title,
      });
    },
    otherFileNameList: ["gitleaks.toml"],
    scope: "git-root",
  },
  ".golangci.yaml": {
    content: (context) => {
      const previousConfig = YAML.parse(context.originalContent || "");

      return YAML.stringify({ ...previousConfig, version: "2" });
    },
    otherFileNameList: [".golangci.yml", ".golangci.yaml", ".golangci.toml", ".golangci.json"],
    projectTypes: ["golang-package"],
  },
  ".node-version": {
    content: () => {
      return runtimeVersions.node + "\n";
    },
    scope: "git-root",
  },
  ".npmrc": {
    content: () => {
      const m: Record<string, string> = {
        registry: "https://registry.npmjs.org/",
      };

      return (
        Object.entries(m)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .reduce<Array<string>>((acc, [key, value]) => {
            acc.push(`${key}=${value}`);
            return acc;
          }, [])
          .join("\n") + "\n"
      );
    },
    projectTypes: ["npm-package"],
    scope: "git-root",
  },
  ".oxlintrc.json": {
    content: (context) => {
      const previousConfig: any = safeJsonParse(context.originalContent);
      return (
        JSON.stringify(
          {
            ...oxlintConfig,
            ...(env().DATAMITSU_DEV_MODE
              ? {
                  rules: oxlintConfig.rules,
                }
              : {
                  extends: [
                    tools.Path.forImport(tools.Path.join(context.datamitsuDir, ".oxlintrc.json")),
                  ],
                  rules: previousConfig.rules,
                }),
            $schema: tools.Path.forImport(
              tools.Path.join(context.datamitsuDir, "oxlint_configuration_schema.json"),
            ),
          },
          null,
          2,
        ) + "\n"
      );
    },
    projectTypes: ["npm-package"],
  },
  ".syncpackrc.json": {
    content: () => {
      return (
        JSON.stringify(
          {
            semverGroups: [
              {
                dependencies: ["**"],
                dependencyTypes: ["**"],
                packages: ["**"],
                range: "",
              },
            ],
            versionGroups: [
              {
                dependencies: ["$LOCAL"],
                dependencyTypes: ["!local"],
                label: "use workspace protocol for local packages",
                pinVersion: "workspace:*",
              },
            ],
          },
          null,
          2,
        ) + "\n"
      );
    },
    otherFileNameList: [
      ".syncpackrc",
      ".syncpackrc.json",
      ".syncpackrc.yaml",
      ".syncpackrc.yml",
      ".syncpackrc.js",
      ".syncpackrc.ts",
      ".syncpackrc.mjs",
      ".syncpackrc.cjs",
      "syncpack.config.js",
      "syncpack.config.cjs",
      "syncpack.config.ts",
      "syncpack.config.mjs",
    ],
    projectTypes: ["npm-package"],
    scope: "git-root",
  },
  ".tombi.toml": {
    content: (context) => {
      const data = TOML.parse(context.originalContent || "");

      return TOML.stringify({
        ...data,
        "toml-version": "v1.1.0",
      });
    },
    otherFileNameList: ["tombi.toml", ".tombi.toml"],
    scope: "git-root",
  },
  ".trufflehog-exclude-paths.txt": {
    content: (context) => {
      const MANAGED_BEGIN = "# BEGIN datamitsu managed — regenerated on init";
      const MANAGED_END = "# END datamitsu managed";

      const managedBlock = [MANAGED_BEGIN, ...trufflehogExcludePaths, MANAGED_END].join("\n");

      const existing = context.originalContent || "";

      // Strip previous managed block (if any) and keep user additions.
      const userContent = existing
        // oxlint-disable-next-line unicorn/prefer-string-replace-all
        .replace(
          new RegExp(
            `${escapeRegExp(MANAGED_BEGIN)}[\\s\\S]*?${escapeRegExp(MANAGED_END)}\\n?`,
            "g",
          ),
          "",
        )
        .trim();

      return userContent.length > 0 ? `${managedBlock}\n\n${userContent}\n` : `${managedBlock}\n`;
    },
    scope: "git-root",
  },
  ".vscode/extensions.json": {
    content: vscodeExtensions,
    scope: "git-root",
  },
  ".vscode/settings.json": {
    content: vscodeSettings,
    scope: "git-root",
  },
  ".yamlfmt.yaml": {
    content: (context) => {
      const data = YAML.parse(context.originalContent || "");

      const formatter = Object.fromEntries(
        Object.entries({
          ...data?.formatter,
          array_indent: 2,
          eof_newline: true,
          force_array_style: "block",
          force_quote_style: "double",
          indent: 2,
          line_ending: "lf",
          pad_line_comments: 1,
          retain_line_breaks_single: false,
          trim_trailing_whitespace: true,
          type: "basic",
        }).sort(([a], [b]) => a.localeCompare(b)),
      );

      return YAML.stringify(
        Object.fromEntries(
          Object.entries({ ...data, exclude: yamlIgnore, formatter }).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ),
      );
    },
    otherFileNameList: [".yamlfmt", "yamlfmt.yml", "yamlfmt.yaml", ".yamlfmt.yml"],
    scope: "git-root",
  },
  ".yamllint.yaml": {
    content: (context) => {
      const data = YAML.parse(context.originalContent || "");

      const rules = Object.fromEntries(
        Object.entries({
          ...data?.rules,
          comments: { "min-spaces-from-content": 1 },
          "comments-indentation": "enable",
          "document-end": "disable",
          "document-start": "disable",
          "empty-lines": { max: 1 },
          indentation: { "indent-sequences": true, spaces: 2 },
          "key-ordering": "disable",
          "line-length": "disable",
          truthy: { "check-keys": false, level: "error" },
        }).sort(([a], [b]) => a.localeCompare(b)),
      );

      return YAML.stringify(
        Object.fromEntries(
          Object.entries({
            ...data,
            extends: "default",
            ignore: yamlIgnore.join("\n") + "\n",
            rules,
          }).sort(([a], [b]) => a.localeCompare(b)),
        ),
      );
    },
    otherFileNameList: [".yamllint", ".yamllint.yml"],
    scope: "git-root",
  },
  "commitlint.config.js": {
    content: (context) => {
      return [
        `export { config as default } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "commitlint.config.js"))}";`,
        "",
      ].join("\n");
    },
    otherFileNameList: [
      ".commitlintrc",
      ".commitlintrc.json",
      ".commitlintrc.yaml",
      ".commitlintrc.yml",
      ".commitlintrc.js",
      ".commitlintrc.cjs",
      ".commitlintrc.mjs",
      ".commitlintrc.ts",
      ".commitlintrc.cts",
      ".commitlintrc.mts",
      "commitlint.config.js",
      "commitlint.config.cjs",
      "commitlint.config.mjs",
      "commitlint.config.ts",
      "commitlint.config.cts",
      "commitlint.config.mts",
    ],
    scope: "git-root",
  },
  "cspell.config.js": {
    content: (context) => {
      return [
        `export { config as default } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "cspell.config.js"))}";`,
        "",
      ].join("\n");
    },
    otherFileNameList: [
      ".cspell.config.yaml",
      ".cspell.config.yml",
      "cspell.config.yaml",
      "cspell.config.yml",
      ".cspell.yaml",
      ".cspell.yml",
      "cspell.yaml",
      "cspell.yml",
      ".cspell.json",
      "cspell.json",
      ".cSpell.json",
      "cSpell.json",
      ".cspell.jsonc",
      "cspell.jsonc",
      ".cspell.config.json",
      ".cspell.config.jsonc",
      "cspell.config.json",
      "cspell.config.jsonc",
      "cspell.config.mjs",
      "cspell.config.cjs",
      ".cspell.config.mjs",
      ".cspell.config.cjs",
      ".cspell.config.js",
      "cspell.config.mts",
      "cspell.config.ts",
      "cspell.config.cts",
      ".cspell.config.mts",
      ".cspell.config.ts",
      ".cspell.config.cts",
      "cspell.config.toml",
      ".cspell.config.toml",
    ],
    scope: "git-root",
  },
  // delete-only configuration - removes deprecated config files without creating new ones
  "deprecated-configs": {
    deleteOnly: true,
    otherFileNameList: [
      ".babelrc",
      ".babelrc.js",
      "babel.config.js",
      ".lintstagedrc",
      ".lintstagedrc.json",
      ".lintstagedrc.yaml",
      ".lintstagedrc.yml",
      ".lintstagedrc.mjs",
      "lint-staged.config.mjs",
      ".lintstagedrc.cjs",
      "lint-staged.config.cjs",
      "lint-staged.config.js",
      ".lintstagedrc.js",
      ".husky",
      ".taplo.toml",
      "taplo.toml",
    ],
  },
  "eslint.config.js": {
    content: (context) => {
      if (env().DATAMITSU_DEV_MODE) {
        return `import { join } from "node:path";

import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "eslint.config.js"))}";
import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
  /** @type {import("./dist/type-fest").PackageJson} */ (packageJSON),
  undefined,
  {
    plugins: {
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
  ...config,
  {
    rules: {
      "playwright/no-standalone-expect": "off",
      "unicorn/no-object-as-default-parameter": "off",
    },
  },
];
`;
      }

      return `import { join } from "node:path";

  import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "eslint.config.js"))}";

  import packageJSON from "./package.json" with { type: "json" };

  const config = await defineConfig(
  /** @type {import("${facts().env.DATAMITSU_PACKAGE_NAME}/type-fest").PackageJson} */ (packageJSON),
  undefined,
  {
    plugins: {
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
    },
  },
);

export default config;
`;
    },
    otherFileNameList: [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      "eslint.config.ts",
      "eslint.config.mts",
      "eslint.config.cts",
      // deprecated
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.yaml",
      ".eslintrc.yml",
      ".eslintrc.json",
    ],
    projectTypes: ["npm-package"],
  },
  // 		return (
  // 			JSON.stringify(
  // 				{
  // 					...data,
  // 					Disable: {
  // 						...data.Disable,
  // 					},
  // 				},
  // 				null,
  // 				2
  // 			) + "\n"
  // 		);
  // 	},
  // },
  "hadolint.yaml": {
    content: (context) => {
      const data = YAML.parse(context.originalContent || "");

      return YAML.stringify({
        ...data,
      });
    },
    otherFileNameList: [
      ".hadolint.yaml",
      "hadolint.yaml",
      ".config/hadolint.yaml",
      ".hadolint/hadolint.yaml",
    ],
    scope: "git-root",
  },
  "knip.config.js": {
    content: (context) => {
      return [
        `import { config } from "${tools.Path.forImport(
          tools.Path.join(context.datamitsuDir, "knip.config.js"),
        )}";`,
        "",
        `const internalConfig = { ...config${
          env().DATAMITSU_DEV_MODE
            ? `, ...${JSON.stringify(
                {
                  ignoreBinaries: ["bin/datamitsu.js"],
                  ignoreDependencies: [
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
                },
                null,
                2,
              )}`
            : ""
        } };`,
        "",
        "export default internalConfig;",
        "",
      ].join("\n");
    },
    otherFileNameList: [
      "knip.json",
      "knip.jsonc",
      ".knip.json",
      ".knip.jsonc",
      "knip.ts",
      "knip.js",
      "knip.config.ts",
      "knip.config.js",
    ],
    projectTypes: ["npm-package"],
    scope: "git-root",
  },
  "lefthook.yaml": {
    content: (context) => {
      const existing = YAML.parse(context.originalContent || "");

      return YAML.stringify({
        ...existing,
        "commit-msg": {
          commands: {
            "lint commit message": {
              run: `${facts().binaryCommand} exec commitlint -- --edit {1}`,
            },
          },
        },
        "post-checkout": {
          commands: {
            [`init ${facts().packageName}`]: {
              priority: 2,
              run: `${facts().binaryCommand} init`,
            },
            "install deps": {
              priority: 1,
              run: `pnpm i`,
            },
          },
        },
        "pre-commit": {
          commands: {
            ...existing?.["pre-commit"]?.commands,
            [`${facts().packageName}-check`]: {
              priority: 1,
              run: `${facts().binaryCommand} check --file-scoped`,
              stage_fixed: true,
            },
          },
          parallel: false,
        },
      });
    },
    otherFileNameList: [
      ".lefthook.yml",
      "lefthook.yaml",
      ".config/lefthook.yml",
      ".lefthook.yaml",
      ".config/lefthook.yaml",
      "lefthook.toml",
      ".lefthook.toml",
      ".config/lefthook.toml",
      "lefthook.json",
      ".lefthook.json",
      ".config/lefthook.json",
    ],
    scope: "git-root",
  },

  "package.json": {
    content: ({ isRoot, originalContent }) => {
      const data = JSON.parse(originalContent || "{}") as PackageJson;

      const scripts: PackageJson["scripts"] = {
        ...data.scripts,
        ...(isRoot
          ? ({
              postinstall: undefined,
              preinstall: undefined,
              prepare: env().DATAMITSU_DEV_MODE ? "pnpm datamitsu init" : "datamitsu init",
            } as any)
          : {}),

        ...(env().DATAMITSU_DEV_MODE && {
          postinstall: "pnpm build:lib",
        }),

        fix: undefined,
        lint: undefined,
      };

      const config: PackageJson = {
        ...data,

        scripts: scripts && Object.keys(scripts).length > 0 ? scripts : undefined,
        type: data.type ?? "module",
        ...(typeof data.config === "object"
          ? {
              config: {
                ...data.config,
                syncpack: undefined,
              },
            }
          : {}),
        dependencies: cleanDependencies(data.dependencies),
        devDependencies: {
          ...cleanDependencies(data.devDependencies),
          ...(env().DATAMITSU_DEV_MODE ? {} : { [packageJsonName]: packageJsonVersion }),
        },
        engines: isRoot
          ? {
              node: `>=${runtimeVersions.node}`,
              pnpm: `>=${fnmVersions.pnpm.version}`,
            }
          : undefined,
        optionalDependencies: cleanDependencies(data.optionalDependencies),
        packageManager: isRoot ? `pnpm@${fnmVersions.pnpm.version}` : undefined,
        peerDependencies: cleanDependencies(data.peerDependencies),
        ...({
          cspell: undefined,
          eslintConfig: undefined,
          "lint-staged": undefined,
          pnpm: undefined,
          prettier: undefined,
          syncpack: undefined,
        } as any),
      };

      return JSON.stringify(config, null, 2) + "\n";
    },
    projectTypes: ["npm-package"],
  },
  "pnpm-workspace.yaml": {
    content: (context) => {
      // https://github.com/pnpm/plugin-better-defaults
      const existing = YAML.parse(context.originalContent || "");

      const config = {
        ...existing,
        audit: true,
        auditLevel: "high",
        autoInstallPeers: true,
        enableGlobalVirtualStore: true,
        enablePrePostScripts: false,
        hoistPattern: [],
        ignorePatchFailures: false,
        optimisticRepeatInstall: true,
        resolutionMode: "lowest-direct",
        savePrefix: "",
        strictSsl: true,
        unsafePerm: false,
        verifyDepsBeforeRun: "install",
      };

      if (config.hoistPattern?.length === 1 && config.hoistPattern[0] === "*") {
        config.hoistPattern = [];
      }

      return YAML.stringify(
        Object.fromEntries(Object.entries(config).sort(([a], [b]) => a.localeCompare(b))),
      );
    },
    projectTypes: ["pnpm-package"],
    scope: "git-root",
  },
  // 		return INI.stringify(data);
  // 	},
  // },
  "prettier.config.js": {
    content: (context) => {
      return [
        `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "prettier.config.js"))}";`,
        "",
        `const config = defineConfig();`,
        "",
        "export default config;",
        "",
      ].join("\n");
    },
    otherFileNameList: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.json5",
      ".prettierrc.js",
      "prettier.config.js",
      ".prettierrc.ts",
      "prettier.config.ts",
      ".prettierrc.mjs",
      "prettier.config.mjs",
      ".prettierrc.mts",
      "prettier.config.mts",
      ".prettierrc.cjs",
      "prettier.config.cjs",
      ".prettierrc.cts",
      "prettier.config.cts",
      ".prettierrc.toml",
    ],
    projectTypes: ["npm-package"],
  },
  "pyproject.toml": {
    content: (context) => {
      const data = TOML.parse(context.originalContent || "");

      return TOML.stringify({
        ...data,
        tool: data.tool
          ? (() => {
              const { tombi, ...rest } = data.tool;
              return Object.keys(rest).length > 0 ? rest : undefined;
            })()
          : undefined,
      });
    },
    projectTypes: ["python-package"],
  },
  "turbo.json": {
    content: (context) => {
      const data = safeJsonParse(context.originalContent);

      return (
        JSON.stringify(
          {
            ...data,
            $schema: "https://turbo.build/schema.json",
            globalEnv: ["TZ", "PORT", "CI"],
            tasks: {
              ...data.tasks,
              build: {
                dependsOn: ["build:lib", "^build"],
                outputs: ["dist/**", ".next/**", "!.next/cache/**"],
              },
              "build:lib": {
                dependsOn: ["^build:lib"],
                outputs: ["dist/**", ".next/**", "!.next/cache/**"],
              },
            },
          },
          null,
          2,
        ) + "\n"
      );
    },
    projectTypes: ["turbo-package"],
    scope: "git-root",
  },
  ...aiTools,
};

export const initCommands: config.MapOfInitCommands = {
  lefthook: {
    args: ["install", "--force"],
    command: "lefthook",
    description: "Install git hooks with lefthook",
    when: "lefthook.yaml",
  },
};
