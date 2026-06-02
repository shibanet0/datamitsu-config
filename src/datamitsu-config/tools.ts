import { indentSettings } from "./constants";
import {
  dockerfileGlobs,
  dotenvLinterGlobs,
  eslintGlobs,
  jsonExcludeGlobs,
  jsonGlobs,
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
  | "oxlint"
  | "pre-commit"
  | "prettier"
  | "shellcheck"
  | "shfmt"
  | "sort-package-json"
  | "syncpack"
  | "toml"
  | "tsc"
  | "typstyle"
  | "yamlfmt"
  | "yamllint"
  | "yq-json"
  | "yq-properties"
  | "yq-yaml";

const _toolPriority: Tool[] = [
  "syncpack",
  "oxlint",
  "tsc",
  "cspell",
  "yq-json",
  "yq-properties",
  "eslint",
  "prettier",
  "sort-package-json",
  "golangci-lint",
  "typstyle",
  "editorconfig-checker",
  "dotenv-linter",
  "shfmt",
  "shellcheck",
  "hadolint",
  "toml",
  "yq-yaml",
  "yamlfmt",
  "yamllint",
  "pre-commit",
];
const toolPriority = [...new Set<Tool>(_toolPriority)].reduce<Record<Tool, number>>(
  (acc, el, i) => {
    acc[el] = i;
    return acc;
  },
  {} as Record<Tool, number>,
);

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
        priority: toolPriority.cspell,
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
        priority: toolPriority["dotenv-linter"],
        scope: "per-file",
      },
      lint: {
        app: "dotenv-linter",
        args: ["check", "{files}"],
        batch: true,
        globs: dotenvLinterGlobs,
        priority: toolPriority["dotenv-linter"],
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
        priority: toolPriority["editorconfig-checker"],
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
        priority: toolPriority.eslint,
        scope: "per-project",
      },
      lint: {
        app: "eslint",
        args: ["--quiet", "-c", "{cwd}/eslint.config.js", "{files}"],
        batch: true,
        globs: eslintGlobs,
        priority: toolPriority.eslint,
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
        priority: toolPriority["golangci-lint"],
        scope: "per-project",
      },
      lint: {
        app: "golangci-lint",
        args: ["run"],
        priority: toolPriority["golangci-lint"],
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
        priority: toolPriority.hadolint,
        scope: "per-file",
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
        priority: toolPriority.oxlint,
        scope: "per-project",
      },
      lint: {
        app: "oxlint",
        args: ["--disable-nested-config", "-c", "{cwd}/.oxlintrc.json", "{files}"],
        batch: true,
        globs: oxlintGlobs,
        priority: toolPriority.oxlint,
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
        priority: toolPriority["pre-commit"],
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
        priority: toolPriority.prettier,
        scope: "per-project",
      },
      lint: {
        app: "prettier",
        args: ["-u", "--check", "--config", "{cwd}/prettier.config.js", "{files}"],
        batch: true,
        globs: prettierGlobs,
        priority: toolPriority.prettier,
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
        priority: toolPriority.shellcheck,
        scope: "per-file",
      },
    },
  },
  shfmt: {
    name: "shfmt - Shell Script Formatter",
    operations: {
      fix: {
        app: "shfmt",
        args: ["-w", "-i", "2", "-ci", "-sr", "{file}"],
        globs: shellGlobs,
        priority: toolPriority.shfmt,
        scope: "per-file",
      },
      lint: {
        app: "shfmt",
        args: ["-d", "-i", "2", "-ci", "-sr", "{file}"],
        globs: shellGlobs,
        priority: toolPriority.shfmt,
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
        priority: toolPriority["sort-package-json"],
        scope: "per-file",
      },
      lint: {
        app: "sort-package-json",
        args: ["--check", "--quiet"],
        batch: false,
        globs: packageJsonGlobs,
        priority: toolPriority["sort-package-json"],
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
        priority: toolPriority.syncpack,
        scope: "repository",
      },
      lint: {
        app: "syncpack",
        args: ["lint", "--config", "{root}/.syncpackrc.json"],
        globs: packageJsonGlobs,
        priority: toolPriority.syncpack,
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
        priority: toolPriority.toml,
        scope: "repository",
      },
      lint: {
        app: "tombi",
        args: ["lint", "--quiet", "--no-cache", "--offline", "{files}"],
        batch: true,
        globs: tomlGlobs,
        priority: toolPriority.toml,
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
        priority: toolPriority.tsc,
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
        priority: toolPriority.tsc,
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
          String(indentSettings.typ?.lineWidth),
          "-t",
          String(indentSettings.typ?.indentWidth),
          "-v",
          "--inplace",
          "{file}",
        ],
        globs: typstGlobs,
        priority: toolPriority.typstyle,
        scope: "per-file",
      },
      lint: {
        app: "typstyle",
        args: [
          "-l",
          String(indentSettings.typ?.lineWidth),
          "-t",
          String(indentSettings.typ?.indentWidth),
          "-v",
          "--check",
          "{file}",
        ],
        globs: typstGlobs,
        priority: toolPriority.typstyle,
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
        priority: toolPriority.yamlfmt,
        scope: "repository",
      },
      lint: {
        app: "yamlfmt",
        args: ["-conf", "{root}/.yamlfmt.yaml", "-lint", "{files}"],
        batch: true,
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: toolPriority.yamlfmt,
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
        priority: toolPriority.yamllint,
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
        priority: toolPriority["yq-json"],
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
        priority: toolPriority["yq-properties"],
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
        priority: toolPriority["yq-yaml"],
        scope: "per-file",
      },
    },
  },
};
