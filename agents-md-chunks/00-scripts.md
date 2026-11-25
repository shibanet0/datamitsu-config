## Project Scripts

Every repository package, regardless of language (TypeScript, Go, Python, Rust, Swift, Kotlin), exposes a `package.json` with unified scripts so monorepo entry points stay consistent and Turbo can orchestrate them.

### Standard Scripts

Implement the relevant subset; names and meanings are fixed.

#### Run

- **`dev`** — Start everything the package needs (dev server, backend, foreground infrastructure containers, workers); root `dev` starts the whole project. Persistent.
- **`dev:mock`** — `dev` with external dependencies mocked. Optional and persistent.

#### Generate

- **`generate` / `generate:*`** — Explicitly refresh derived files committed to version control (images, icons, fonts, manifests, generated code). Root refreshes all declared outputs in scope; a specialization refreshes only its named outputs. This defines output lifecycle, not duration.
- **`codegen` / `codegen:*`** — Generate source from schemas or other declared inputs (SDKs, database types, shared constants). Use under `generate` for committed code, or build preparation for disposable build inputs; never for images or other assets.
- Generators must be repeatable without duplicate outputs. Document inputs, outputs, prerequisites, and interruption behavior; failed or interrupted runs are not complete refreshes. Generation updates files only; it does not stage, commit, or push.
- Committed generated files are ordinary build inputs. Never refresh them implicitly from `build`, `build:lib`, `dev`, or install hooks. If one is missing, fail with its explicit refresh command rather than starting an expensive refresh. Freshness checks must say whether they inspect inputs cheaply or reproduce generation; command names imply neither speed nor byte reproducibility.

#### Build

- **`build:lib`** — Prepare `dev` or `build` (asset prelinking, intermediate internal libraries, disposable generated code). Depend on `codegen` only for required build-time generation whose outputs are uncommitted; manual refreshes are not prerequisites.
- **`build`** — Final application or library build, depending on applicable `build:lib` steps. Same name for every target (SPA, binary, npm package, WebAssembly artifact).

#### Test

- **`test`** — Complete non-interactive main unit/integration suite in scope, including its expensive tests. Package commands cover that package; root covers all packages. E2E and visual/screenshot suites are separate by default; include only by explicit documented project decision. Run overlapping tests once. Missing prerequisites for included suites fail explicitly. Never update baselines or install test dependencies.
- **`test:fast`** — Explicit short-feedback subset with a project-defined whole-command budget, including preparation and orchestration; not a synonym for unit tests or individually quick tests.
- **`test:slow`** — Optional separately runnable expensive tests from the main suite; need not complement `test:fast` (many individually quick tests can make the full suite slow without belonging here).
- **`test:watch`** — Persistent main-suite watch. State watched suites; disclose if coverage is incomplete. Use `test:fast:watch` for a fast-subset watch.
- **`test:coverage`** — Coverage for the same scope as `test`; explicitly report unsupported suites and never claim partial coverage is complete. Name subset coverage, e.g. `test:fast:coverage`.
- **`test:e2e`** — Separate end-to-end behavior tests, excluded from `test` by default. Browser use, infrastructure, or Testcontainers alone does not make tests E2E; expensive integration tests are not automatically E2E, and E2E need not be slow.
- **`test:e2e:ui`** — E2E runner UI mode, where supported.
- **`test:e2e:install`** — Idempotently install E2E runner dependencies (e.g., browsers).
- **`test:snapshots`** — Separate visual/screenshot tests, excluded from `test` by default. Ordinary text, object, and inline snapshot assertions stay in unit/integration suites; snapshots alone do not make them visual tests.
- **`test:snapshots:update`** — Update screenshot baselines.
- **`test:update`** — Update inline snapshots.

Set a fast-run budget where feedback is needed: package speed does not establish root speed. Specify runner resources, parallelism, cache conditions, and setup costs; cache hits alone do not prove speed. No universal time threshold applies. If growth exceeds budget, optimize or explicitly revise the subset, budget, or hook placement; never silently drop tests from the complete suite.

Changed/affected-package selection is scope reduction, not a test type or complete root run. Use explicit runner/Turbo filters and report reduced scope. Hooks may select short-feedback checks but cannot redefine `test` or replace required complete verification. Do not add placeholder fast/slow scripts without a meaningful subset.

#### Quality

Always run `pnpm dm check` after a task. It runs fixers (formatters, auto-fixes), then linters (type checking, ESLint), and should finish without errors.

#### Misc

- **`pull:*`** — Fetch external inputs (OpenAPI schemas, translations, auth context, etc.). Put local transformations in `generate` or `codegen`; make fetch-then-generate dependencies explicit, not hidden in ordinary builds.
- **`upgrade:deps`** — Update dependencies.

### Naming Rules

- A colon specializes a command: `test:fast`, `test:slow`, `test:e2e`, `build:lib`, `generate:images`. Prefer standard everyday entry points: `dev`, `generate`, `codegen`, `build`, `build:lib`, `test`, `pull:*`, `upgrade:deps`. Document additional commands when distinct operations or tool contracts require them, including purpose, prerequisites, and side effects. Preserve runtime/package-manager/deployment names (e.g. lifecycle hooks, production `start`); do not force them into unrelated commands.
- Pass environments via variables, never script names. No `dev:fast`, `build:prod`, or `test:ci`.

### Complex Orchestration

Move scripts exceeding one command (multiple steps, parallelism, dependencies, conditions, intermediate variables) to `Taskfile.yaml`; keep the `package.json` script as a thin delegating entry point.

In Turborepo workspaces, Turbo owns cross-package dependencies; Taskfile owns steps within a package. Declare package dependencies in workspace manifests and task ordering in `turbo.json`. A package Taskfile must not build siblings with `pnpm --filter ... build` or start a second Turbo graph from a task already run by Turbo. A root entry point may invoke Turbo once; targeted builds needing dependency builds must enter that same root graph with an explicit package/dependency filter, not a second Taskfile graph.

For example, keep build and explicit refresh separate in `package.json`:

```json
{
  "scripts": {
    "build": "pnpm dm exec task -- build",
    "generate": "pnpm dm exec task -- generate"
  }
}
```

Build does not refresh committed files. Add only the applicable script subset and task dependencies.

#### Taskfile Conventions

- Every task has a `desc` field.
- `deps` for parallel prerequisites, `cmds` for sequential steps.
- Namespacing matches script names: `generate:*`, `codegen:*`, `build:*`, `test:*`, `dev:*`.

```yaml
version: "3"

tasks:
  build:
    desc: Full application build
    deps: [build:lib]
    cmds:
      - pnpm exec tsdown

  build:lib:
    desc: Prepare local build artifacts
    cmds:
      - pnpm exec tsc --emitDeclarationOnly --declaration

  generate:
    desc: Refresh committed generated sources explicitly
    cmds:
      - task: codegen

  codegen:
    desc: Generate committed types from OpenAPI schema
    sources: [schema.yaml]
    generates: [src/generated/api.ts]
    cmds:
      - pnpm exec openapi-typescript ./schema.yaml -o ./src/generated/api.ts
```

### Turborepo

Pipeline tasks are declared in `turbo.json`:

- Turbo owns cross-package dependency order via `dependsOn: ["^build"]`; package Taskfile steps must not repeat dependency builds.
- Set `"cache": false` for non-cacheable tasks (`dev`, `pull:*`), `"persistent": true` for long-running tasks (`dev`, `dev:mock`, `test:watch`), and `"outputs"` for cacheable build artifacts (`dist/**`, `.next/**`, etc.).
- Root `test` covers every package's main unit/integration suite. Keep E2E and visual/screenshot suites separate in tasks or CI by default; include them only by explicit documented decision. Separate root/package orchestration to prevent aggregate self-invocation. Filters and `test:fast` explicitly narrow the main-suite graph, never implicitly.
- When caching generation, include all generator inputs and configuration in cache keys and all outputs in `outputs`. Cacheability does not make explicit committed-file refresh an automatic build dependency.

### Anti-Patterns

DO NOT:

- Do not rename standard everyday operations arbitrarily or hide distinct operations under the wrong standard name. Document justified extensions and tool-required names. Never disguise production startup, migrations, packaging, signing, or publication as dev startup or ordinary builds. Naming exceptions do not authorize side effects or override the separate cleanup rule below.
- Do not chain commands with `&&` in `package.json`; move orchestration to Taskfile.
- Do not write `.sh` orchestration scripts or use Makefiles; use Taskfile.
- Do not encode environments in script names; use variables.
- Do not add a `clean` script. Use `git clean -fdx`.
