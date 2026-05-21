import { indentSettings } from "./constants";

const eslintGlobs: string[] = [
  "**/*.js",
  "**/*.jsx",
  "**/*.mjs",
  "**/*.cjs",
  "**/*.ts",
  "**/*.mts",
  "**/*.cts",
  "**/*.tsx",
  "**/*.html",
  "**/*.json",
  "**/*.jsonc",
  "**/*.json5",
  "**/*.toml",
];

const prettierGlobs: string[] = [...eslintGlobs, "**/*.d.ts", "**/*.md"];

const oxlintGlobs: string[] = [
  "**/*.js",
  "**/*.mjs",
  "**/*.cjs",
  "**/*.ts",
  "**/*.mts",
  "**/*.cts",
  "**/*.tsx",
  "**/*.jsx",
  "**/*.vue",
  "**/*.astro",
  "**/*.svelte",
];

const dotenvLinterGlobs: string[] = ["**/*.env", "**/.env", "**/*.env.*", "**/.env.*"];

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
  | "ruff"
  | "ruff-format"
  | "shellcheck"
  | "shfmt"
  | "sort-package-json"
  | "syncpack"
  | "terraform-docs"
  | "terraform-fmt"
  | "terragrunt-fmt"
  | "tflint"
  | "toml"
  | "tsc"
  | "typstyle"
  | "yamlfmt"
  | "yamllint";

const _toolPriority: Tool[] = [
  "syncpack",
  "oxlint",
  "tsc",
  "cspell",
  "eslint",
  "prettier",
  "sort-package-json",
  "golangci-lint",
  "ruff",
  "ruff-format",
  "typstyle",
  "editorconfig-checker",
  "dotenv-linter",
  "shfmt",
  "shellcheck",
  "hadolint",
  "toml",
  "tflint",
  "terraform-fmt",
  "terragrunt-fmt",
  "terraform-docs",
  "yamllint",
  "yamlfmt",
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
        globs: ["**/*.go"],
        priority: toolPriority["golangci-lint"],
        scope: "per-project",
      },
      lint: {
        app: "golangci-lint",
        args: ["run"],
        globs: ["**/*.go"],
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
        globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.dockerfile"],
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
  ruff: {
    name: "Ruff - Python Linter",
    operations: {
      fix: {
        app: "ruff",
        args: ["check", "--fix", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: toolPriority.ruff,
        scope: "per-project",
      },
      lint: {
        app: "ruff",
        args: ["check", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: toolPriority.ruff,
        scope: "per-project",
      },
    },
    projectTypes: ["python-package"],
  },
  "ruff-format": {
    name: "Ruff Format",
    operations: {
      fix: {
        app: "ruff",
        args: ["format", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: toolPriority["ruff-format"],
        scope: "per-project",
      },
      lint: {
        app: "ruff",
        args: ["format", "--check", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: toolPriority["ruff-format"],
        scope: "per-project",
      },
    },
    projectTypes: ["python-package"],
  },
  shellcheck: {
    name: "ShellCheck - Shell Script Linter",
    operations: {
      lint: {
        app: "shellcheck",
        args: ["-x", "{file}"],
        globs: ["**/*.sh", "**/*.bash"],
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
        globs: ["**/*.sh", "**/*.bash"],
        priority: toolPriority.shfmt,
        scope: "per-file",
      },
      lint: {
        app: "shfmt",
        args: ["-d", "-i", "2", "-ci", "-sr", "{file}"],
        globs: ["**/*.sh", "**/*.bash"],
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
        globs: ["**/package.json"],
        priority: toolPriority["sort-package-json"],
        scope: "per-file",
      },
      lint: {
        app: "sort-package-json",
        args: ["--check", "--quiet"],
        batch: false,
        globs: ["**/package.json"],
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
        globs: ["**/package.json"],
        priority: toolPriority.syncpack,
        scope: "repository",
      },
      lint: {
        app: "syncpack",
        args: ["lint", "--config", "{root}/.syncpackrc.json"],
        globs: ["**/package.json"],
        priority: toolPriority.syncpack,
        scope: "repository",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  "terraform-docs": {
    name: "terraform-docs",
    operations: {
      fix: {
        app: "terraform-docs",
        args: [
          "markdown",
          "table",
          "--output-file",
          "README.md",
          "--output-mode",
          "inject",
          "{cwd}",
        ],
        globs: ["**/*.tf"],
        priority: toolPriority["terraform-docs"],
        scope: "per-project",
      },
    },
    projectTypes: ["terraform-project"],
  },
  "terragrunt-fmt": {
    name: "Terragrunt HCL Format",
    operations: {
      fix: {
        app: "terragrunt",
        args: ["hclfmt"],
        globs: ["**/*.hcl"],
        priority: toolPriority["terragrunt-fmt"],
        scope: "repository",
      },
    },
    projectTypes: ["terragrunt-project"],
  },
  tflint: {
    name: "TFLint - Terraform Linter",
    operations: {
      lint: {
        app: "tflint",
        args: [
          "--recursive",
          "--config",
          "{root}/.tflint.hcl",
          "--color",
          "--minimum-failure-severity=notice",
          "--call-module-type=none",
        ],
        globs: ["**/*.tf"],
        priority: toolPriority.tflint,
        scope: "per-project",
      },
    },
    projectTypes: ["terraform-project"],
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
  "tofu-fmt": {
    name: "OpenTofu fmt",
    operations: {
      fix: {
        app: "tofu",
        args: ["fmt", "-recursive", "{cwd}"],
        globs: ["**/*.tf", "**/*.tfvars"],
        priority: toolPriority["terraform-fmt"],
        scope: "per-project",
      },
      lint: {
        app: "tofu",
        args: ["fmt", "-check", "-recursive", "-diff", "{cwd}"],
        globs: ["**/*.tf", "**/*.tfvars"],
        priority: toolPriority["terraform-fmt"],
        scope: "per-project",
      },
    },
    projectTypes: ["terraform-project"],
  },
  tombi: {
    name: "🦅 TOML Toolkit 🦅",
    operations: {
      fix: {
        app: "tombi",
        args: ["format", "--quiet", "--no-cache", "--offline", "{files}"],
        batch: true,
        globs: ["**/*.toml"],
        priority: toolPriority.toml,
        scope: "repository",
      },
      lint: {
        app: "tombi",
        args: ["lint", "--quiet", "--no-cache", "--offline", "{files}"],
        batch: true,
        globs: ["**/*.toml"],
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
        globs: ["**/*.d.ts", "**/*.ts", "**/*.mts", "**/*.cts", "**/*.tsx"],
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
        globs: ["**/*.typ"],
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
        globs: ["**/*.typ"],
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
        args: ["{files}"],
        batch: true,
        globs: ["**/*.yaml", "**/*.yml"],
        priority: toolPriority.yamlfmt,
        scope: "per-file",
      },
      lint: {
        app: "yamlfmt",
        args: ["-lint", "{files}"],
        batch: true,
        globs: ["**/*.yaml", "**/*.yml"],
        priority: toolPriority.yamlfmt,
        scope: "per-file",
      },
    },
  },
  yamllint: {
    name: "yamllint - YAML Linter",
    operations: {
      lint: {
        app: "yamllint",
        args: [
          "-d",
          "{extends: default, rules: {document-start: disable, line-length: disable}}",
          "{files}",
        ],
        batch: true,
        globs: ["**/*.yaml", "**/*.yml"],
        priority: toolPriority.yamllint,
        scope: "per-file",
      },
    },
  },
};
