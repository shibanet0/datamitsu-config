import { indentSettings } from "./constants";
import {
  dockerfileGlobs,
  dotenvLinterGlobs,
  eslintGlobs,
  jsonExcludeGlobs,
  jsonGlobs,
  oxfmtGlobs,
  oxlintGlobs,
  packageJsonGlobs,
  prettierGlobs,
  propertiesGlobs,
  shellGlobs,
  tomlGlobs,
  typescriptGlobs,
  typstGlobs,
  yamlExcludeGlobs,
  yamlGlobs,
} from "./globs";

type Tool =
  | "cspell"
  | "dotenv-linter"
  | "editorconfig-checker"
  | "eslint"
  | "golangci-lint"
  | "hadolint"
  | "oxfmt"
  | "oxlint"
  | "pre-commit"
  | "prettier"
  | "shellcheck"
  | "shfmt"
  | "sort-package-json"
  | "syncpack"
  | "toml"
  | "tsc"
  | "tsgo"
  | "typstyle"
  | "yamlfmt"
  | "yamllint"
  | "yq-json"
  | "yq-properties"
  | "yq-yaml";

const toPriorityMap = (list: Tool[]): Record<Tool, number> =>
  [...new Set<Tool>(list)].reduce<Record<Tool, number>>(
    (acc, el, i) => {
      acc[el] = i;
      return acc;
    },
    {} as Record<Tool, number>,
  );

// Priority order for `fix` operations. Only includes tools that expose a fix.
const _fixPriority: Tool[] = [
  "syncpack",
  "oxlint",
  "yq-json",
  "yq-properties",
  "eslint",
  "prettier",
  "oxfmt",
  "sort-package-json",
  "golangci-lint",
  "typstyle",
  "dotenv-linter",
  "shfmt",
  "toml",
  "yq-yaml",
  "yamlfmt",
  "pre-commit",
];

// Priority order for `lint` operations. Only includes tools that expose a lint.
const _lintPriority: Tool[] = [
  "syncpack",
  "oxlint",
  "tsc",
  "tsgo",
  "cspell",
  "eslint",
  "prettier",
  "oxfmt",
  "sort-package-json",
  "golangci-lint",
  "typstyle",
  "editorconfig-checker",
  "dotenv-linter",
  "shfmt",
  "shellcheck",
  "hadolint",
  "toml",
  "yamlfmt",
  "yamllint",
];

const fixPriority = toPriorityMap(_fixPriority);
const lintPriority = toPriorityMap(_lintPriority);

const isCI = facts().env.CI === "true" || facts().env.CI === "1";

export const toolsConfig: config.MapOfTools = {
  ...(isCI && {
    trufflehog: {
      name: "trufflehog",
      operations: {
        lint: {
          app: "trufflehog",
          args: [
            "filesystem",
            "{root}",
            "--only-verified",
            "--fail",
            "--no-update",
            "--exclude-paths",
            "{root}/.trufflehog-exclude-paths.txt",
          ],
          globs: ["**/*"],
          scope: "repository",
        },
      },
    },
  }),
  cspell: {
    name: "CSpell - A Spelling Checker for Code!",
    operations: {
      lint: {
        app: "cspell",
        args: [
          "lint",
          "-c",
          "{root}/cspell.config.js",
          "--quiet",
          "--no-must-find-files",
          "--unique",
          "--cache",
          "--cache-location",
          "{toolCache}/.cspellcache",
          "{files}",
        ],
        globs: ["**/*"],
        priority: lintPriority.cspell,
        scope: "per-project",
      },
    },
  },
  "dotenv-linter": {
    name: "dotenv-linter",
    operations: {
      fix: {
        app: "dotenv-linter",
        args: ["fix", "{files}"],
        batch: true,
        globs: dotenvLinterGlobs,
        priority: fixPriority["dotenv-linter"],
        scope: "per-file",
      },
      lint: {
        app: "dotenv-linter",
        args: ["check", "{files}"],
        batch: true,
        globs: dotenvLinterGlobs,
        priority: lintPriority["dotenv-linter"],
        scope: "per-file",
      },
    },
  },
  "editorconfig-checker": {
    name: "EditorConfig Checker",
    operations: {
      lint: {
        app: "editorconfig-checker",
        args: ["-config", ".editorconfig-checker.json"],
        globs: ["**/*"],
        priority: lintPriority["editorconfig-checker"],
        scope: "repository",
      },
    },
  },
  eslint: {
    name: "Eslint",
    operations: {
      fix: {
        app: "eslint",
        args: ["--quiet", "--fix", "-c", "{cwd}/eslint.config.js", "{files}"],
        batch: true,
        globs: eslintGlobs,
        priority: fixPriority.eslint,
        scope: "per-project",
      },
      lint: {
        app: "eslint",
        args: ["--quiet", "-c", "{cwd}/eslint.config.js", "{files}"],
        batch: true,
        globs: eslintGlobs,
        priority: lintPriority.eslint,
        scope: "per-project",
      },
    },
    projectTypes: ["npm-package"],
  },
  gitleaks: {
    name: "gitleaks",
    operations: {
      lint: {
        app: "gitleaks",
        args: [
          "dir",
          "--redact",
          "--verbose",
          "--no-banner",
          "--exit-code",
          "1",
          "--config",
          "{root}/.gitleaks.toml",
          "{files}",
        ],
        globs: ["**/*"],
        scope: "repository",
      },
    },
  },
  // gitleaks: {
  //   name: "gitleaks",
  //   operations: {
  //     lint: {
  //       args: ["--config", "{root}/.gitleaks.toml"), "dir"],
  //       app: "gitleaks",
  //       globs: ["**/*"],
  //       scope: "repository",
  //     },
  //   },
  // },
  "golangci-lint": {
    name: "golangci-lint - Go Linter",
    operations: {
      fix: {
        app: "golangci-lint",
        args: ["run", "--fix"],
        priority: fixPriority["golangci-lint"],
        scope: "per-project",
      },
      lint: {
        app: "golangci-lint",
        args: ["run"],
        priority: lintPriority["golangci-lint"],
        scope: "per-project",
      },
    },
    projectTypes: ["golang-package"],
  },
  hadolint: {
    name: "hadolint - Dockerfile Linter",
    operations: {
      lint: {
        app: "hadolint",
        args: ["-c", "{root}/hadolint.yaml", "--verbose", "{file}"],
        globs: dockerfileGlobs,
        priority: lintPriority.hadolint,
        scope: "per-file",
      },
    },
  },
  oxfmt: {
    name: "oxfmt - The JavaScript Oxidation Compiler Formatter",
    operations: {
      fix: {
        app: "oxfmt",
        args: ["--write", "--config", "{root}/oxfmt.config.ts", "{files}"],
        batch: true,
        globs: oxfmtGlobs,
        priority: fixPriority.oxfmt,
        scope: "repository",
      },
      lint: {
        app: "oxfmt",
        args: ["--check", "--config", "{root}/oxfmt.config.ts", "{files}"],
        batch: true,
        globs: oxfmtGlobs,
        priority: lintPriority.oxfmt,
        scope: "repository",
      },
    },
  },
  oxlint: {
    name: "Oxlint",
    operations: {
      fix: {
        app: "oxlint",
        args: ["--disable-nested-config", "-c", "{cwd}/.oxlintrc.json", "--fix", "{files}"],
        batch: true,
        globs: oxlintGlobs,
        priority: fixPriority.oxlint,
        scope: "per-project",
      },
      lint: {
        app: "oxlint",
        args: ["--disable-nested-config", "-c", "{cwd}/.oxlintrc.json", "{files}"],
        batch: true,
        globs: oxlintGlobs,
        priority: lintPriority.oxlint,
        scope: "per-project",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  "pre-commit": {
    name: "pre-commit - Multi-language pre-commit hooks",
    operations: {
      fix: {
        app: "pre-commit",
        args: ["run", "--all-files", "--color=always"],
        globs: ["**/*"],
        priority: fixPriority["pre-commit"],
        scope: "repository",
      },
    },
    projectTypes: ["pre-commit-project"],
  },
  // knip: {
  //   name: "Knip",
  //   operations: {
  //     lint: {
  //       args: ["--config", tools.Path.join(facts().gitRoot, "knip.config.js")],
  //       app: "knip",
  //       globs: [],
  //       mode: "whole-project",
  //     },
  //   },
  //   projectTypes: ["npm-package","typescript-project"],
  // },
  prettier: {
    name: "Prettier - Code Formatter",
    operations: {
      fix: {
        app: "prettier",
        args: ["-u", "--write", "--config", "{cwd}/prettier.config.js", "{files}"],
        batch: true,
        globs: prettierGlobs,
        priority: fixPriority.prettier,
        scope: "per-project",
      },
      lint: {
        app: "prettier",
        args: ["-u", "--check", "--config", "{cwd}/prettier.config.js", "{files}"],
        batch: true,
        globs: prettierGlobs,
        priority: lintPriority.prettier,
        scope: "per-project",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  shellcheck: {
    name: "ShellCheck - Shell Script Linter",
    operations: {
      lint: {
        app: "shellcheck",
        args: ["-x", "{file}"],
        globs: shellGlobs,
        priority: lintPriority.shellcheck,
        scope: "per-file",
      },
    },
  },
  shfmt: {
    name: "shfmt - Shell Script Formatter",
    operations: {
      fix: {
        app: "shfmt",
        args: ["-w", "-i", String(indentSettings.indentWidth), "-ci", "-sr", "{file}"],
        globs: shellGlobs,
        priority: fixPriority.shfmt,
        scope: "per-file",
      },
      lint: {
        app: "shfmt",
        args: ["-d", "-i", String(indentSettings.indentWidth), "-ci", "-sr", "{file}"],
        globs: shellGlobs,
        priority: lintPriority.shfmt,
        scope: "per-file",
      },
    },
  },
  "sort-package-json": {
    name: "sort-package-json",
    operations: {
      fix: {
        app: "sort-package-json",
        args: ["--quiet"],
        batch: false,
        globs: packageJsonGlobs,
        priority: fixPriority["sort-package-json"],
        scope: "per-file",
      },
      lint: {
        app: "sort-package-json",
        args: ["--check", "--quiet"],
        batch: false,
        globs: packageJsonGlobs,
        priority: lintPriority["sort-package-json"],
        scope: "per-file",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  syncpack: {
    name: "syncpack",
    operations: {
      fix: {
        app: "syncpack",
        args: ["fix", "--config", "{root}/.syncpackrc.json"],
        globs: packageJsonGlobs,
        priority: fixPriority.syncpack,
        scope: "repository",
      },
      lint: {
        app: "syncpack",
        args: ["lint", "--config", "{root}/.syncpackrc.json"],
        globs: packageJsonGlobs,
        priority: lintPriority.syncpack,
        scope: "repository",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  tombi: {
    name: "🦅 TOML Toolkit 🦅",
    operations: {
      fix: {
        app: "tombi",
        args: ["format", "--quiet", "--no-cache", "--offline", "{files}"],
        batch: true,
        globs: tomlGlobs,
        priority: fixPriority.toml,
        scope: "repository",
      },
      lint: {
        app: "tombi",
        args: ["lint", "--quiet", "--no-cache", "--offline", "{files}"],
        batch: true,
        globs: tomlGlobs,
        priority: lintPriority.toml,
        scope: "repository",
      },
    },
  },
  tsc: {
    name: "Tsc",
    operations: {
      lint: {
        app: "tsc",
        args: ["--noEmit", "--incremental", "--tsBuildInfoFile", "{toolCache}/tsbuildinfo.json"],
        globs: typescriptGlobs,
        priority: lintPriority.tsc,
        scope: "per-project",
      },
    },
    projectTypes: ["typescript-project"],
  },
  tsgo: {
    name: "tsgo",
    operations: {
      lint: {
        app: "tsgo",
        args: ["--noEmit", "--incremental", "--tsBuildInfoFile", "{toolCache}/tsbuildinfo.json"],
        globs: typescriptGlobs,
        priority: lintPriority.tsgo,
        scope: "per-project",
      },
    },
    projectTypes: ["typescript-project"],
  },
  typstyle: {
    name: "typstyle - Typst Code Formatter",
    operations: {
      fix: {
        app: "typstyle",
        args: [
          "-l",
          String(indentSettings.lineWidth),
          "-t",
          String(indentSettings.indentWidth),
          "-v",
          "--inplace",
          "{file}",
        ],
        globs: typstGlobs,
        priority: fixPriority.typstyle,
        scope: "per-file",
      },
      lint: {
        app: "typstyle",
        args: [
          "-l",
          String(indentSettings.lineWidth),
          "-t",
          String(indentSettings.indentWidth),
          "-v",
          "--check",
          "{file}",
        ],
        globs: typstGlobs,
        priority: lintPriority.typstyle,
        scope: "per-file",
      },
    },
  },
  yamlfmt: {
    name: "yamlfmt - YAML Formatter",
    operations: {
      fix: {
        app: "yamlfmt",
        args: ["-conf", "{root}/.yamlfmt.yaml", "{files}"],
        batch: true,
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: fixPriority.yamlfmt,
        scope: "repository",
      },
      lint: {
        app: "yamlfmt",
        args: ["-conf", "{root}/.yamlfmt.yaml", "-lint", "{files}"],
        batch: true,
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: lintPriority.yamlfmt,
        scope: "repository",
      },
    },
  },
  yamllint: {
    name: "yamllint - YAML Linter",
    operations: {
      lint: {
        app: "yamllint",
        args: ["-c", "{root}/.yamllint.yaml", "--strict", "{files}"],
        batch: true,
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: lintPriority.yamllint,
        scope: "repository",
      },
    },
  },
  "yq-json": {
    name: "yq - JSON Key Sorter",
    operations: {
      fix: {
        app: "yq",
        args: ["-i", "-p", "json", "-o", "json", "sort_keys(..)", "{file}"],
        excludeGlobs: jsonExcludeGlobs,
        globs: jsonGlobs,
        priority: fixPriority["yq-json"],
        scope: "per-file",
      },
    },
  },
  "yq-properties": {
    name: "yq - Properties Key Sorter",
    operations: {
      fix: {
        app: "yq",
        args: ["-i", "-p", "props", "-o", "props", "sort_keys(..)", "{file}"],
        globs: propertiesGlobs,
        priority: fixPriority["yq-properties"],
        scope: "per-file",
      },
    },
  },
  "yq-yaml": {
    name: "yq - YAML Key Sorter",
    operations: {
      fix: {
        app: "yq",
        args: ["-i", "sort_keys(..)", "{file}"],
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: fixPriority["yq-yaml"],
        scope: "per-file",
      },
    },
  },
};
