import { indentSettings } from "./constants";
import {
  actionlintGlobs,
  cargoGlobs,
  composeGlobs,
  dockerfileGlobs,
  dotenvLinterGlobs,
  droastGlobs,
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
  stylelintGlobs,
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
  | "dclint"
  | "dotenv-linter"
  | "droast"
  | "editorconfig-checker"
  | "eslint"
  | "golangci-lint"
  | "golangci-lint-fmt"
  | "grype"
  | "hadolint"
  | "harper-cli"
  | "helm"
  | "knip"
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
  | "stylelint"
  | "syncpack"
  | "terraform-docs"
  | "terraform-fmt"
  | "terragrunt-fmt"
  | "tflint"
  | "toml"
  | "trivy"
  | "tsc"
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
  // Before the formatters: its fixes rewrite declarations, and oxfmt settles the
  // resulting whitespace afterwards rather than fighting it.
  "stylelint",
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
  "droast",
  "toml",
  "tflint",
  "terraform-fmt",
  "terragrunt-fmt",
  "terraform-docs",
  // Reorders compose keys and services, so it runs before yamlfmt settles the style.
  "dclint",
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
  "cspell",
  "harper-cli",
  "vale",
  "eslint",
  "stylelint",
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
  "droast",
  "dclint",
  "checkmake",
  "helm",
  "toml",
  "tflint",
  "terraform-fmt",
  "yamlfmt",
  "yamllint",
  "lefthook-validate",
  // Last of the source analyses: whole-repository scope and tens of seconds, so
  // everything that can fail on one file gets to fail first.
  "knip",
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
        args: ["scan", "--exit-code", "1", "{target}"],
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
        args: ["--no-banner", "--no-error", "-i", "{target}", "-o", "{toolCache}/blint"],
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
        args: ["-c", "{root}/.dclint.yaml", "--fix", "{files}"],
        globs: composeGlobs,
        priority: fixPriority.dclint,
        scope: "repository",
      },
      lint: {
        app: "dclint",
        // dclint exits 0 on warnings, and this config sets every rule it knows to error. A rule
        // added by a dclint release starts at its own default level, so without the cap a new
        // warning-level rule would run on every file and fail nothing.
        args: [
          "-c",
          "{root}/.dclint.yaml",
          "--formatter",
          "json",
          "--max-warnings",
          "0",
          "--color=false",
          "{files}",
        ],
        globs: composeGlobs,
        priority: lintPriority.dclint,
        scope: "repository",
      },
    },
    outputParser: { module: "core", parser: "dclint" },
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
        globs: dotenvLinterGlobs,
        priority: fixPriority["dotenv-linter"],
        scope: "per-file",
      },
      lint: {
        app: "dotenv-linter",
        args: ["check", "{files}"],
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
      // Only droast's safe fixers (instruction casing, EXPOSE protocol case, AS casing, a redundant
      // --platform). The run reports nothing and fails nothing: every finding belongs to lint.
      fix: {
        app: "droast",
        args: ["-c", "{root}/droast.toml", "--fix", "--no-fail", "--shellcheck", "off", "{root}"],
        globs: droastGlobs,
        priority: fixPriority.droast,
        scope: "repository",
      },
      // Repository scope (not per-file like hadolint): droast resolves each Dockerfile's build
      // context from compose and bake files, so it runs once from the git root. A Dockerfile
      // linted on its own is measured against its own directory and reports a false DF033.
      lint: {
        // `required`: the app's dependsOn puts the managed ShellCheck on PATH, so a missing one is
        // a broken install to report, not a check to skip.
        app: "droast",
        args: [
          "-c",
          "{root}/droast.toml",
          "--format",
          "json",
          "--shellcheck",
          "required",
          "{root}",
        ],
        globs: droastGlobs,
        priority: lintPriority.droast,
        scope: "repository",
      },
    },
    outputParser: { module: "core", parser: "droast" },
    // Its globs deliberately include inputs that are not Dockerfiles — a Compose file, an ignore
    // file, its own config — because each of them changes a verdict. Any of those alone would
    // otherwise start a repository-scoped run in a project that has no Dockerfile at all, where
    // droast exits 1 with "No Dockerfile(s) found" before it lints anything, which no --no-fail
    // covers. The project type is the gate: it is exactly "this repository has a Dockerfile".
    projectTypes: ["docker-project"],
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
        // `--fix-type` excludes `directive`, which is the fix type for an unused `eslint-disable`
        // comment — and "unused" here means "names a rule this config has off", which is ~1600 of
        // them. Without the flag, `--quiet --fix` deletes the comment and its reason text, prints
        // nothing, and exits 0; pre-commit then stages the deletion.
        //
        // Two shapes of loss. A rule oxlint owns: the comment goes, oxlint still reports it, and
        // nothing tells you the replacement is `oxlint-disable-next-line`. A rule parked in
        // `temporary.ts`: the deletion is completely silent, and when that rule is triaged back on,
        // the deliberate suppression that would have covered it is already gone.
        //
        // With the flag the directive is left alone and reported instead, so it is a decision.
        args: [
          "--quiet",
          "--fix",
          "--fix-type",
          "problem,suggestion,layout",
          "-c",
          "{cwd}/eslint.config.mjs",
          "{files}",
        ],
        globs: eslintGlobs,
        granularity: "file",
        priority: fixPriority.eslint,
        scope: "per-project",
      },
      lint: {
        app: "eslint",
        args: ["--quiet", "--format=json", "-c", "{cwd}/eslint.config.mjs", "{files}"],
        globs: eslintGlobs,
        granularity: "file",
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
          // `gitleaks dir` takes a single path and silently ignores extras,
          // scanning the working directory instead — so the file list never
          // reached it. {target} says what it actually scans.
          "{target}",
        ],
        arity: "dir",
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
        args: ["dir:{target}", "--fail-on", "high"],
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
        args: ["lint", "{target}"],
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
        // `--no-progress` is belt and braces: knip already suppresses the
        // progress stream when stdout is not a TTY, and under datamitsu it never
        // is — but the stream writes ANSI escapes to stdout, which is where the
        // report the parser reads comes from.
        //
        // The cache is keyed on each file's size and mtime, not its contents —
        // knip's FileEntryCache compares those two and nothing else — so a
        // checkout that restores identical bytes still invalidates. It only
        // holds what knip extracted per file; the graph is rebuilt every run,
        // which is why this is a discount and not a short-circuit — measured at
        // 32s cold against 23s warm on a private pnpm/Turborepo monorepo (~60
        // workspaces), for 18 MB.
        args: [
          "--config",
          "{root}/knip.config.js",
          "--reporter",
          "json",
          "--no-progress",
          "--cache",
          "--cache-location",
          "{toolCache}/.knipcache",
        ],
        // No globs, which for a repository-scoped operation means "run whenever
        // anything is selected" rather than "look at every file". An enumerated
        // list was tried and removed: it existed to spare the pre-commit hook a
        // whole-repository scan, and knip left that hook. What remained was only
        // the failure mode — knip reads HTML, stylesheets, extensionless configs
        // (.prettierrc, .swcrc, .graphqlrc), lock files that activate plugins,
        // and whatever a consumer's compilers add, so a selection of one unlisted
        // file skipped the run and passed. Slow and right beats fast and silent.
        globs: [],
        priority: lintPriority.knip,
        scope: "repository",
      },
    },
    outputParser: { module: "core", parser: "knip" },
    projectTypes: ["npm-package", "typescript-project"],
    // knip takes no file arguments at all, so `--file-scoped` cannot narrow it:
    // in pre-commit it scans the whole repository on every commit, 11.9s of it
    // on a private pnpm/Turborepo monorepo (~60 workspaces). None of the
    // twenty-one knip configs surveyed across the projects knip lists as its
    // users runs knip from a git hook either; a hook runs what can be narrowed
    // to the staged files, and CI runs what cannot.
    //
    // No `fix` operation, and that is deliberate rather than pending. knip's
    // own documentation is "run Knip as you normally would, and if the report
    // looks good then run it again with the `--fix` flag" — its findings are a
    // static analysis with false positives, which is what `@knipignore`,
    // `ignoreIssues` and `ignoreDependencies` all exist to correct. Removing
    // 436 `export` keywords on the strength of an unread report is not a thing
    // to automate. Acting on one is a deliberate command:
    //   dm exec knip -- --fix --fix-type exports,types
    skip: !isCI,
    skipReason: "runs in CI only",
  },
  kubeconform: {
    name: "kubeconform - Kubernetes manifest validation",
    operations: {
      // helm-chart projectType only (no universal k8s-YAML glob). Raw Helm
      // templates are not plain manifests — when enabling, validate rendered
      // output (`helm template`) rather than the template files directly.
      lint: {
        app: "kubeconform",
        args: ["-ignore-missing-schemas", "-summary", "{target}"],
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
      lint: {
        app: "ls-lint",
        args: [
          "-config",
          "{root}/.datamitsu/ls-lint-managed.yml",
          "-config",
          "{root}/.ls-lint.yml",
        ],
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
        globs: markdownGlobs,
        scope: "repository",
      },
      lint: {
        app: "mdsf",
        args: ["verify", "{files}"],
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
        args: ["scan", "source", "--recursive", "{target}"],
        globs: ["**/*"],
        priority: lintPriority["osv-scanner"],
        scope: "repository",
      },
    },
    skip: !isCI,
    skipReason: "runs in CI only",
  },
  /**
   * Per-project runs, one config at the git root.
   *
   * The runs are split because a repository-scoped operation is one process over the whole tree,
   * and every other JS/TS tool here is already per project. The config stays at the root because
   * oxfmt carries no `projectTypes` — it formats by file type, so it reaches a Go module's markdown
   * — and a project-scoped managed config therefore lands in every detected project: measured on a
   * bare fixture, `oxfmt.config.ts` in `.github/workflows/` and `docker/` as well as the root.
   *
   * Nothing stops being formatted, and nothing is formatted twice. A file outside every workspace
   * belongs to the root project, so the root run still covers the docs, the workflows and the
   * dotfiles — measured on a pnpm monorepo: the same 270 files as under the repository scope, split
   * across its 11 projects, 270 of them distinct, and zero files in the root run that live inside a
   * child project.
   *
   * Two things about the binary that the scope makes worth stating, both measured:
   *
   * - **`{files}` is not optional.** Given no positional paths oxfmt formats the current directory
   *   recursively — so a path-less root run in a monorepo would walk into every package with the
   *   root's settings. It cannot happen here: the token always carries the matched set, and a
   *   selection that matches nothing schedules no run at all ("No applicable tools found") rather
   *   than a run with an empty list.
   * - **An explicit `--config` beats nested discovery.** oxfmt otherwise picks up a config from a
   *   subdirectory; with `--config` named, a stray `.oxfmtrc.json` inside the project does not
   *   override it. That is why there is no `--disable-nested-config` here the way oxlint has one —
   *   it would be a flag that changes nothing.
   */
  oxfmt: {
    name: "oxfmt - The JavaScript Oxidation Compiler Formatter",
    operations: {
      fix: {
        app: "oxfmt",
        args: [
          "--write",
          "--no-error-on-unmatched-pattern",
          "--config",
          "{root}/oxfmt.config.ts",
          "{files}",
        ],
        globs: oxfmtGlobs,
        priority: fixPriority.oxfmt,
        scope: "per-project",
      },
      lint: {
        app: "oxfmt",
        args: [
          "--check",
          "--no-error-on-unmatched-pattern",
          "--config",
          "{root}/oxfmt.config.ts",
          "{files}",
        ],
        globs: oxfmtGlobs,
        priority: lintPriority.oxfmt,
        scope: "per-project",
      },
    },
  },
  oxlint: {
    name: "Oxlint",
    operations: {
      fix: {
        app: "oxlint",
        args: ["--disable-nested-config", "-c", "{cwd}/oxlint.config.mts", "--fix", "{files}"],
        globs: oxlintGlobs,
        priority: fixPriority.oxlint,
        scope: "per-project",
      },
      lint: {
        app: "oxlint",
        args: ["--disable-nested-config", "-c", "{cwd}/oxlint.config.mts", "{files}"],
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
        globs: actionlintGlobs,
        scope: "repository",
      },
      lint: {
        app: "pinact",
        args: ["run", "--check", "{files}"],
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
        globs: prettierGlobs,
        granularity: "file",
        priority: fixPriority.prettier,
        scope: "per-project",
      },
      lint: {
        app: "prettier",
        args: ["-u", "--check", "--config", "{cwd}/prettier.config.mjs", "{files}"],
        globs: prettierGlobs,
        granularity: "file",
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
        globs: ["**/*.py", "**/*.pyi"],
        granularity: "file",
        priority: fixPriority.ruff,
        scope: "per-project",
      },
      lint: {
        app: "ruff",
        args: ["check", "--quiet", "{files}"],
        globs: ["**/*.py", "**/*.pyi"],
        granularity: "file",
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
        globs: ["**/*.py", "**/*.pyi"],
        granularity: "file",
        priority: fixPriority["ruff-format"],
        scope: "per-project",
      },
      lint: {
        app: "ruff",
        args: ["format", "--check", "--quiet", "{files}"],
        globs: ["**/*.py", "**/*.pyi"],
        granularity: "file",
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
        globs: packageJsonGlobs,
        priority: fixPriority["sort-package-json"],
        scope: "per-file",
      },
      lint: {
        app: "sort-package-json",
        args: ["--check", "--quiet"],
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
        globs: sqlGlobs,
        granularity: "file",
        scope: "per-project",
      },
      lint: {
        app: "sqruff",
        args: ["lint", "{files}"],
        globs: sqlGlobs,
        granularity: "file",
        scope: "per-project",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
  stylelint: {
    name: "Stylelint - CSS Linter",
    operations: {
      fix: {
        app: "stylelint",
        args: [
          "--fix",
          "--config",
          "{cwd}/stylelint.config.mjs",
          "--allow-empty-input",
          "--cache",
          "--cache-location",
          "{toolCache}/.stylelintcache",
          "{files}",
        ],
        globs: stylelintGlobs,
        priority: fixPriority.stylelint,
        scope: "per-project",
      },
      lint: {
        app: "stylelint",
        args: [
          "--config",
          "{cwd}/stylelint.config.mjs",
          "--allow-empty-input",
          "--cache",
          "--cache-location",
          "{toolCache}/.stylelintcache",
          "{files}",
        ],
        globs: stylelintGlobs,
        priority: lintPriority.stylelint,
        scope: "per-project",
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
  "tofu-fmt": {
    name: "OpenTofu fmt",
    operations: {
      fix: {
        app: "tofu",
        args: ["fmt", "-recursive", "{target}"],
        globs: ["**/*.tf", "**/*.tfvars"],
        priority: fixPriority["terraform-fmt"],
        scope: "per-project",
      },
      lint: {
        app: "tofu",
        args: ["fmt", "-check", "-recursive", "-diff", "{target}"],
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
        globs: tomlGlobs,
        priority: fixPriority.toml,
        scope: "repository",
      },
      lint: {
        app: "tombi",
        args: ["lint", "--quiet", "--no-cache", "--offline", "{files}"],
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
        args: [
          "fs",
          "--exit-code",
          "1",
          "--severity",
          "HIGH,CRITICAL",
          "--no-progress",
          "{target}",
        ],
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
  ty: {
    name: "ty - Astral's Python type checker",
    operations: {
      // ty checks .py/.pyi and Jupyter notebooks (.ipynb) — NOT Markdown.
      lint: {
        app: "ty",
        args: ["check", "{files}"],
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
        excludeGlobs: yamlExcludeGlobs,
        globs: yamlGlobs,
        priority: fixPriority.yamlfmt,
        scope: "repository",
      },
      lint: {
        app: "yamlfmt",
        args: ["-conf", "{root}/.yamlfmt.yaml", "-lint", "{files}"],
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
        arity: "one",
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
        arity: "one",
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
        arity: "one",
        // dclint owns key order in Compose files (Compose's own order, not alphabetical); sorting
        // them here undoes `dclint --fix` on every run and fails its order rules.
        excludeGlobs: [...yamlExcludeGlobs, ...lefthookConfigGlobs, ...composeGlobs],
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
        args: ["--offline", "--format", "plain", "{target}"],
        globs: actionlintGlobs,
        scope: "repository",
      },
    },
    skip: true,
    skipReason: optInSkip,
  },
};
