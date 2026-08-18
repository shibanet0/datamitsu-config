import { indentSettings } from "./constants";
import {
  actionlintGlobs,
  cargoGlobs,
  composeGlobs,
  dockerfileGlobs,
  dotenvLinterGlobs,
  eslintGlobs,
  goGlobs,
  helmGlobs,
  jsonExcludeGlobs,
  jsonGlobs,
  lefthookConfigGlobs,
  makefileGlobs,
  markdownGlobs,
  oxfmtGlobs,
  oxlintGlobs,
  packageJsonGlobs,
  prettierGlobs,
  propertiesGlobs,
  protoGlobs,
  shellGlobs,
  sqlGlobs,
  tomlGlobs,
  tyGlobs,
  typescriptGlobs,
  typstGlobs,
  yamlExcludeGlobs,
  yamlGlobs,
} from "./globs";

type Tool =
  | "actionlint"
  | "bearer"
  | "checkmake"
  | "cspell"
  | "dotenv-linter"
  | "editorconfig-checker"
  | "eslint"
  | "golangci-lint"
  | "golangci-lint-fmt"
  | "grype"
  | "hadolint"
  | "harper-cli"
  | "helm"
  | "lefthook-sort"
  | "lefthook-validate"
  | "lychee"
  | "osv-scanner"
  | "oxfmt"
  | "oxlint"
  | "pre-commit"
  | "prettier"
  | "protolint"
  | "ruff"
  | "ruff-format"
  | "rustfmt"
  | "shellcheck"
  | "shfmt"
  | "sort-package-json"
  | "syncpack"
  | "terraform-docs"
  | "terraform-fmt"
  | "terragrunt-fmt"
  | "tflint"
  | "toml"
  | "trivy"
  | "tsc"
  | "tsgo"
  | "typos"
  | "typstyle"
  | "vale"
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
  "typos",
  "syncpack",
  "oxlint",
  "protolint",
  "yq-json",
  "yq-properties",
  "eslint",
  "prettier",
  "oxfmt",
  "sort-package-json",
  "golangci-lint",
  "ruff",
  "ruff-format",
  "typstyle",
  "dotenv-linter",
  "shfmt",
  "rustfmt",
  "toml",
  "tflint",
  "terraform-fmt",
  "terragrunt-fmt",
  "terraform-docs",
  "yq-yaml",
  // Orders lefthook configs before yamlfmt reformats them, so the formatter
  // always gets the last word on style.
  "lefthook-sort",
  "yamlfmt",
  "pre-commit",
];

// Priority order for `lint` operations. Only includes tools that expose a lint.
const _lintPriority: Tool[] = [
  "typos",
  "syncpack",
  "oxlint",
  "protolint",
  "actionlint",
  "tsc",
  "tsgo",
  "cspell",
  "harper-cli",
  "vale",
  "eslint",
  "prettier",
  "oxfmt",
  "sort-package-json",
  "golangci-lint",
  "golangci-lint-fmt",
  "typstyle",
  "editorconfig-checker",
  "dotenv-linter",
  "shfmt",
  "rustfmt",
  "shellcheck",
  "hadolint",
  "checkmake",
  "helm",
  "toml",
  "tflint",
  "terraform-fmt",
  "yamlfmt",
  "yamllint",
  "lefthook-validate",
  "lychee",
  "grype",
  "trivy",
  "osv-scanner",
  "bearer",
];

const fixPriority = toPriorityMap(_fixPriority);
const lintPriority = toPriorityMap(_lintPriority);

const isCI = facts().env.CI === "true" || facts().env.CI === "1";

// Reason shown in the skipped report for the opt-in batch below.
const optInSkip = "opt-in: pending manual review & config tuning";

export const toolsConfig: config.MapOfTools = {
  actionlint: {
    name: "actionlint - GitHub Actions Workflow Linter",
    operations: {
      lint: {
        app: "actionlint",
        // `-format {{json .}}` emits the machine-readable report the parser reads (on stdout).
        // The Go-template braces are not datamitsu placeholders — only the literal {file},
        // {files}, {root}, {cwd} and {toolCache} tokens are substituted — so they pass through.
        args: ["-no-color", "-format", "{{json .}}", "{file}"],
        globs: actionlintGlobs,
        priority: lintPriority.actionlint,
        scope: "per-file",
      },
    },
    outputParser: { module: "core", parser: "actionlint" },
  },
  // ── opt-in tools (disabled by default) ──────────────────────────────────
  // Registered as apps + wired here, but held at `skip: true` until each is
  // manually validated and its config tuned. To enable a tool: drop `skip`
  // (network scanners noted below should become `skip: !isCI` instead) and
  // give it a `priority`. Added 2026-08-11.
  alint: {
    name: "alint - language-agnostic repository structure linter",
    operations: {
      // Ships bundled rulesets; layer/override via its config before enabling.
      lint: {
        app: "alint",
        args: [],
        globs: ["**/*"],
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
  bearer: {
    name: "Bearer - Static Application Security Testing",
    operations: {
      lint: {
        app: "bearer",
        args: ["scan", "--exit-code", "1", "{root}"],
        globs: ["**/*"],
        priority: lintPriority.bearer,
        scope: "repository",
      },
    },
    skip: !isCI,
    skipReason: "runs in CI only",
  },
  blint: {
    name: "blint - binary linter & SBOM generator",
    operations: {
      // Inspects compiled binaries, not source — point `-i` at build output
      // when enabling. Network scanner → enable as `skip: !isCI`.
      lint: {
        app: "blint",
        args: ["--no-banner", "--no-error", "-i", "{root}", "-o", "{toolCache}/blint"],
        globs: ["**/*"],
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
  "cargo-deny": {
    name: "cargo-deny - Rust dependency linter",
    operations: {
      // advisories + bans only (no license policy → no deny.toml required). The
      // advisories DB fetch hits the network → enable as `skip: !isCI`.
      lint: {
        app: "cargo-deny",
        args: ["check", "advisories", "bans"],
        globs: cargoGlobs,
        scope: "per-project",
      },
    },
    projectTypes: ["rust-project"],
    skip: true,
    skipReason: optInSkip,
  },
  checkmake: {
    name: "checkmake - Makefile Linter",
    operations: {
      lint: {
        app: "checkmake",
        args: ["--format={{.LineNumber}}:{{.Rule}}:{{.Violation}}\n", "{file}"],
        globs: makefileGlobs,
        priority: lintPriority.checkmake,
        scope: "per-file",
      },
    },
    outputParser: { module: "core", parser: "checkmake" },
  },
  cspell: {
    name: "CSpell - A Spelling Checker for Code!",
    operations: {
      lint: {
        app: "cspell",
        args: [
          "lint",
          "-c",
          "{root}/cspell.config.mjs",
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
    outputParser: { module: "core", parser: "cspell" },
  },
  dclint: {
    name: "dclint - Docker Compose linter",
    operations: {
      fix: {
        app: "dclint",
        args: ["--fix", "{files}"],
        batch: true,
        globs: composeGlobs,
        scope: "repository",
      },
      lint: {
        app: "dclint",
        args: ["{files}"],
        batch: true,
        globs: composeGlobs,
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
  deptry: {
    name: "deptry - find unused/missing Python dependencies",
    operations: {
      lint: {
        app: "deptry",
        args: ["{cwd}"],
        globs: ["**/*.py", "**/pyproject.toml"],
        scope: "per-project",
      },
    },
    projectTypes: ["python-package"],
    skip: true,
    skipReason: optInSkip,
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
    outputParser: { module: "core", parser: "dotenv_linter" },
  },
  droast: {
    name: "dockerfile-roast - opinionated Dockerfile linter",
    operations: {
      // Repository scope (not per-file like hadolint): droast draws value from
      // the whole build context, so it runs once from the git root.
      lint: {
        app: "droast",
        args: ["{root}"],
        globs: dockerfileGlobs,
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
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
        args: ["--quiet", "--fix", "-c", "{cwd}/eslint.config.mjs", "{files}"],
        batch: true,
        globs: eslintGlobs,
        priority: fixPriority.eslint,
        scope: "per-project",
      },
      lint: {
        app: "eslint",
        args: ["--quiet", "--format=json", "-c", "{cwd}/eslint.config.mjs", "{files}"],
        batch: true,
        globs: eslintGlobs,
        priority: lintPriority.eslint,
        scope: "per-project",
      },
    },
    outputParser: { module: "core", parser: "eslint" },
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
        args: ["run", "--fix", "--allow-parallel-runners"],
        env: {
          GOLANGCI_LINT_CACHE: "{toolCache}",
        },
        priority: fixPriority["golangci-lint"],
        scope: "per-project",
      },
      lint: {
        app: "golangci-lint",
        args: ["run", "--allow-parallel-runners", "--output.json.path=stdout"],
        env: {
          GOLANGCI_LINT_CACHE: "{toolCache}",
        },
        priority: lintPriority["golangci-lint"],
        scope: "per-project",
      },
    },
    outputParser: { module: "core", parser: "golangci_lint" },
    projectTypes: ["golang-package"],
  },
  "golangci-lint-fmt": {
    name: "golangci-lint - Go Linter",
    operations: {
      fix: {
        app: "golangci-lint",
        args: ["fmt"],
        env: {
          GOLANGCI_LINT_CACHE: "{toolCache}",
        },
        priority: fixPriority["golangci-lint-fmt"],
        scope: "per-project",
      },
    },
    projectTypes: ["golang-package"],
  },
  govulncheck: {
    name: "govulncheck - Go vulnerability scanner",
    operations: {
      // Queries the Go vulnerability DB over the network → enable as `skip: !isCI`.
      lint: {
        app: "govulncheck",
        args: ["./..."],
        globs: goGlobs,
        scope: "per-project",
      },
    },
    projectTypes: ["golang-package"],
    skip: true,
    skipReason: optInSkip,
  },
  grype: {
    name: "Grype - Vulnerability Scanner",
    operations: {
      lint: {
        app: "grype",
        args: ["dir:{root}", "--fail-on", "high"],
        globs: ["**/*"],
        priority: lintPriority.grype,
        scope: "repository",
      },
    },
    skip: !isCI,
    skipReason: "runs in CI only",
  },
  hadolint: {
    name: "hadolint - Dockerfile Linter",
    operations: {
      lint: {
        app: "hadolint",
        args: ["-c", "{root}/hadolint.yaml", "--format=json", "{file}"],
        globs: dockerfileGlobs,
        priority: lintPriority.hadolint,
        scope: "per-file",
      },
    },
    outputParser: { module: "core", parser: "hadolint" },
  },
  "harper-cli": {
    name: "Harper - The Grammar Checker for Developers",
    operations: {
      lint: {
        app: "harper-cli",
        args: ["lint", "--dialect", "us", "--format", "compact", "{files}"],
        batch: true,
        globs: markdownGlobs,
        priority: lintPriority["harper-cli"],
        scope: "repository",
      },
    },
    outputParser: { module: "core", parser: "harper_cli" },
  },
  helm: {
    name: "Helm - The Kubernetes Package Manager",
    operations: {
      lint: {
        app: "helm",
        args: ["lint", "{cwd}"],
        globs: helmGlobs,
        priority: lintPriority.helm,
        scope: "per-project",
      },
    },
    projectTypes: ["helm-chart"],
  },
  knip: {
    name: "Knip - Find unused files, dependencies, and exports",
    operations: {
      lint: {
        app: "knip",
        args: ["--config", "{root}/knip.config.js"],
        globs: [],
        scope: "repository",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  kubeconform: {
    name: "kubeconform - Kubernetes manifest validation",
    operations: {
      // helm-chart projectType only (no universal k8s-YAML glob). Raw Helm
      // templates are not plain manifests — when enabling, validate rendered
      // output (`helm template`) rather than the template files directly.
      lint: {
        app: "kubeconform",
        args: ["-ignore-missing-schemas", "-summary", "{cwd}"],
        globs: helmGlobs,
        scope: "per-project",
      },
    },
    projectTypes: ["helm-chart"],
    skip: true,
    skipReason: optInSkip,
  },
  // Rewrites a lefthook config into the order it actually executes: top-level
  // hooks by the git lifecycle, then each hook's commands by `priority`. These
  // files are excluded from yq-yaml (see lefthookConfigGlobs), which would
  // otherwise re-sort them by key and hide the execution order.
  "lefthook-sort": {
    name: "lefthook - Config Sorter",
    operations: {
      fix: {
        app: "lefthook-sort",
        args: ["{file}"],
        globs: lefthookConfigGlobs,
        priority: fixPriority["lefthook-sort"],
        scope: "per-file",
      },
    },
  },
  "lefthook-validate": {
    name: "lefthook - Config Validator",
    operations: {
      lint: {
        app: "lefthook",
        args: ["validate"],
        globs: lefthookConfigGlobs,
        priority: lintPriority["lefthook-validate"],
        // `lefthook validate` checks the whole merged config, so it runs once
        // from the git root rather than per matched file.
        scope: "repository",
      },
    },
  },
  "ls-lint": {
    name: "ls-lint - directory & filename linter",
    operations: {
      // Reads .ls-lint.yml from the git root; author that config before enabling.
      lint: {
        app: "ls-lint",
        args: [],
        globs: ["**/*"],
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
  lychee: {
    name: "lychee - Link Checker",
    operations: {
      lint: {
        app: "lychee",
        args: ["--no-progress", "{files}"],
        batch: true,
        globs: markdownGlobs,
        priority: lintPriority.lychee,
        scope: "repository",
      },
    },
    skip: !isCI,
    skipReason: "runs in CI only (network access)",
  },
  mdsf: {
    name: "mdsf - format code blocks inside Markdown",
    operations: {
      // mdsf shells out to other formatters (must be on PATH); finalize the
      // formatter set when enabling.
      fix: {
        app: "mdsf",
        args: ["format", "{files}"],
        batch: true,
        globs: markdownGlobs,
        scope: "repository",
      },
      lint: {
        app: "mdsf",
        args: ["verify", "{files}"],
        batch: true,
        globs: markdownGlobs,
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
  "osv-scanner": {
    name: "OSV-Scanner - Vulnerability Scanner",
    operations: {
      lint: {
        app: "osv-scanner",
        args: ["scan", "source", "--recursive", "{root}"],
        globs: ["**/*"],
        priority: lintPriority["osv-scanner"],
        scope: "repository",
      },
    },
    skip: !isCI,
    skipReason: "runs in CI only",
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
  pinact: {
    name: "pinact - pin GitHub Actions to commit SHAs",
    operations: {
      fix: {
        app: "pinact",
        args: ["run", "{files}"],
        batch: true,
        globs: actionlintGlobs,
        scope: "repository",
      },
      lint: {
        app: "pinact",
        args: ["run", "--check", "{files}"],
        batch: true,
        globs: actionlintGlobs,
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
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
  prettier: {
    name: "Prettier - Code Formatter",
    operations: {
      fix: {
        app: "prettier",
        args: ["-u", "--write", "--config", "{cwd}/prettier.config.mjs", "{files}"],
        batch: true,
        globs: prettierGlobs,
        priority: fixPriority.prettier,
        scope: "per-project",
      },
      lint: {
        app: "prettier",
        args: ["-u", "--check", "--config", "{cwd}/prettier.config.mjs", "{files}"],
        batch: true,
        globs: prettierGlobs,
        priority: lintPriority.prettier,
        scope: "per-project",
      },
    },
    projectTypes: ["npm-package", "typescript-project"],
  },
  protolint: {
    name: "protolint - Protocol Buffer Linter",
    operations: {
      fix: {
        app: "protolint",
        args: ["lint", "-fix", "{file}"],
        globs: protoGlobs,
        priority: fixPriority.protolint,
        scope: "per-file",
      },
      lint: {
        app: "protolint",
        args: ["lint", "--reporter", "json", "{file}"],
        globs: protoGlobs,
        priority: lintPriority.protolint,
        scope: "per-file",
      },
    },
    outputParser: { module: "core", parser: "protolint" },
  },
  ruff: {
    name: "Ruff - Python Linter",
    operations: {
      fix: {
        app: "ruff",
        args: ["check", "--fix", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: fixPriority.ruff,
        scope: "per-project",
      },
      lint: {
        app: "ruff",
        args: ["check", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: lintPriority.ruff,
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
        priority: fixPriority["ruff-format"],
        scope: "per-project",
      },
      lint: {
        app: "ruff",
        args: ["format", "--check", "--quiet", "{files}"],
        batch: true,
        globs: ["**/*.py", "**/*.pyi"],
        priority: lintPriority["ruff-format"],
        scope: "per-project",
      },
    },
    projectTypes: ["python-package"],
  },
  rustfmt: {
    name: "rustfmt - Rust formatter (cargo fmt)",
    operations: {
      fix: {
        app: "rustfmt",
        args: [],
        globs: ["**/*.rs"],
        priority: fixPriority.rustfmt,
        scope: "per-project",
      },
      lint: {
        app: "rustfmt",
        args: ["--check"],
        globs: ["**/*.rs"],
        priority: lintPriority.rustfmt,
        scope: "per-project",
      },
    },
    projectTypes: ["rust-project"],
    // The rustfmt app runs via a POSIX shell guard; Windows has no `sh` by default.
    skip: facts().os === "windows",
    skipReason: "rustfmt runs via a POSIX shell guard (sh), unavailable on Windows by default",
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
  sqruff: {
    name: "sqruff - SQL linter & formatter",
    operations: {
      fix: {
        app: "sqruff",
        args: ["fix", "{files}"],
        batch: true,
        globs: sqlGlobs,
        scope: "per-project",
      },
      lint: {
        app: "sqruff",
        args: ["lint", "{files}"],
        batch: true,
        globs: sqlGlobs,
        scope: "per-project",
      },
    },
    skip: true,
    skipReason: optInSkip,
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
        priority: fixPriority["terraform-docs"],
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
        priority: fixPriority["terragrunt-fmt"],
        scope: "repository",
      },
    },
    projectTypes: ["terragrunt-project"],
  },
  tflint: {
    name: "TFLint - Terraform Linter",
    operations: {
      fix: {
        app: "tflint",
        args: [
          "--fix",
          "--recursive",
          "--config",
          "{root}/.tflint.hcl",
          "--color",
          "--minimum-failure-severity=notice",
          "--call-module-type=none",
        ],
        globs: ["**/*.tf"],
        priority: fixPriority.tflint,
        scope: "per-project",
      },
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
        priority: lintPriority.tflint,
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
        priority: fixPriority["terraform-fmt"],
        scope: "per-project",
      },
      lint: {
        app: "tofu",
        args: ["fmt", "-check", "-recursive", "-diff", "{cwd}"],
        globs: ["**/*.tf", "**/*.tfvars"],
        priority: lintPriority["terraform-fmt"],
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

  trivy: {
    name: "Trivy - Vulnerability and Misconfiguration Scanner",
    operations: {
      lint: {
        app: "trivy",
        args: ["fs", "--exit-code", "1", "--severity", "HIGH,CRITICAL", "--no-progress", "{root}"],
        globs: ["**/*"],
        priority: lintPriority.trivy,
        scope: "repository",
      },
    },
    skip: !isCI,
    skipReason: "runs in CI only",
  },
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
    skip: !isCI,
    skipReason: "runs in CI only",
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
    outputParser: { module: "core", parser: "tsc" },
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
    outputParser: { module: "core", parser: "tsc" },
    projectTypes: ["typescript-project"],
  },
  ty: {
    name: "ty - Astral's Python type checker",
    operations: {
      // ty checks .py/.pyi and Jupyter notebooks (.ipynb) — NOT Markdown.
      lint: {
        app: "ty",
        args: ["check", "{files}"],
        batch: true,
        globs: tyGlobs,
        scope: "per-project",
      },
    },
    projectTypes: ["python-package"],
    skip: true,
    skipReason: optInSkip,
  },
  typos: {
    name: "typos - Source Code Spell Checker",
    operations: {
      // lint-only by design: `typos --write-changes` auto-"corrects" legitimate
      // identifiers and proper nouns (org names, linter names), so we never wire
      // it into `fix`. Curate real misspellings via .typos.toml instead.
      lint: {
        app: "typos",
        args: ["--format", "brief"],
        globs: ["**/*"],
        priority: lintPriority.typos,
        scope: "repository",
      },
    },
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
  vale: {
    name: "Vale - A Syntax-Aware Linter for Prose",
    operations: {
      lint: {
        app: "vale",
        args: ["--config", "{root}/.vale.ini", "--output", "JSON", "{files}"],
        batch: true,
        globs: markdownGlobs,
        priority: lintPriority.vale,
        scope: "repository",
      },
    },
    outputParser: { module: "core", parser: "vale" },
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
        args: ["-c", "{root}/.yamllint.yaml", "--strict", "-f", "parsable", "{files}"],
        batch: true,
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: lintPriority.yamllint,
        scope: "repository",
      },
    },
    outputParser: { module: "core", parser: "yamllint" },
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
        excludeGlobs: [...yamlExcludeGlobs, ...lefthookConfigGlobs],
        globs: yamlGlobs,
        priority: fixPriority["yq-yaml"],
        scope: "per-file",
      },
    },
  },
  zizmor: {
    name: "zizmor - static analysis for GitHub Actions",
    operations: {
      // --offline keeps it hermetic; with GH_TOKEN it does deeper online audits
      // → enable as `skip: !isCI` if you want the online pass in CI.
      lint: {
        app: "zizmor",
        args: ["--offline", "--format", "plain", "{root}"],
        globs: actionlintGlobs,
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
};
