## Project Scripts

Every package in the repository — regardless of language (TypeScript, Go, Python, Rust, Swift, Kotlin) — exposes a `package.json` with a unified set of scripts. This makes project entry points identical across the monorepo: the same command names work everywhere, and `turbo` orchestrates them from the root.

### Standard Scripts

Implement the relevant subset in each package. Names and meanings are fixed.

#### Run

- **`dev`** — Start everything required for the package to run: dev server, backend, infrastructure containers (without `-d`), workers. From the monorepo root, `dev` brings the whole project up. Persistent.
- **`dev:mock`** — Same as `dev`, with external dependencies mocked. Optional. Persistent.

#### Generate

- **`generate` / `generate:*`** — Explicitly refresh derived files kept in version control: images, icons, fonts, manifests, or generated code. This describes the output lifecycle, not how long the command takes. The root command refreshes all declared outputs in its scope; a specialization refreshes only its named outputs.
- **`codegen` / `codegen:*`** — Generate source code from schemas or other declared inputs: SDKs, database types, or shared constants. Use it under `generate` for committed code or under build preparation for disposable code needed by the build. Do not use this name for image or other asset generation.
- Generators must be repeatable without accumulating duplicate outputs. Document their inputs, outputs, prerequisites, and behavior after interruption. An interrupted or failed run must not be reported as a complete refresh. Generation updates files; it does not stage, commit, or push them.
- Committed generated files are ordinary build inputs. Do not implicitly refresh them from `build`, `build:lib`, `dev`, or install hooks. If a required file is missing, fail with the explicit refresh command instead of starting an expensive refresh. Freshness checks must state whether they inspect inputs cheaply or reproduce the full generation; neither speed nor byte reproducibility is implied by the command name.

#### Build

- **`build:lib`** — Preparatory steps required before `dev` or `build`: asset prelinking, intermediate internal libraries, or disposable generated code. Depend on `codegen` only when that generation is required at build time and its outputs are not committed. Manual refreshes are not build prerequisites.
- **`build`** — Final application or library build. Depends on applicable `build:lib` steps. Same name regardless of target (SPA, binary, npm package, WebAssembly artifact).

#### Test

- **`test`** — The complete non-interactive main unit/integration suite in the command's scope, including expensive tests in that suite. A package command covers that package; the monorepo root covers all packages. E2E and visual/screenshot suites run separately by default; including them in `test` requires an explicit documented project decision. Run each test once even when subsets overlap. Missing prerequisites for an included suite fail explicitly rather than silently excluding it. This command does not update baselines or install test dependencies.
- **`test:fast`** — An explicit short-feedback subset of the main suite with a project-defined budget for the whole command, including preparation and orchestration. It is not a synonym for unit tests or for individually quick tests.
- **`test:slow`** — An optional separately runnable set of expensive tests from the main suite. It need not be the complement of `test:fast`: a large collection of individually quick tests can make the full main suite slow without belonging to this set.
- **`test:watch`** — A persistent watch mode for the main suite. State which suites it watches; if it cannot watch the complete main suite, make that limitation explicit rather than claiming full coverage. Use `test:fast:watch` for a fast-subset watch command.
- **`test:coverage`** — Collect coverage for the same scope as `test`. Report unsupported suites explicitly; never present partial coverage as complete. A subset-specific coverage command names its subset, such as `test:fast:coverage`.
- **`test:e2e`** — Separately runnable end-to-end behavior tests, excluded from `test` by default. Browser use, infrastructure, or Testcontainers alone does not make a test E2E; expensive integration tests are not automatically E2E, and E2E does not mean slow.
- **`test:e2e:ui`** — UI mode for the e2e runner, where supported.
- **`test:e2e:install`** — Install e2e runner dependencies (e.g., browsers). Idempotent.
- **`test:snapshots`** — Separately runnable visual/screenshot tests, excluded from `test` by default. Ordinary text, object, and inline snapshot assertions remain part of their unit/integration suites; they are not moved here merely because they use snapshots.
- **`test:snapshots:update`** — Update screenshot baselines.
- **`test:update`** — Update inline snapshots.

Define a fast-run budget at the scope where feedback is needed: a fast package run does not establish that the root run is fast. State runner resources, parallelism, and cold or warm cache conditions; cache hits alone do not establish suite speed. Include setup costs, not just test-body timings. There is no universal time threshold. If the command exceeds its budget as the suite grows, optimize execution or explicitly revise the subset, budget, or hook placement without silently dropping tests from the complete suite.

Selecting changed or affected packages is a separate scope reduction, not a test type or a complete root run. Use explicit runner/Turbo filters and report the reduced scope. Hooks may select a short-feedback check, but must not redefine `test` or silently replace the complete verification required by the project. Do not add placeholder fast/slow scripts when no meaningful subset exists.

#### Quality

Always run `pnpm dm check` after completing a task. This runs fixers (formatters, auto-fixes) followed by linters (type checking, ESLint). It should complete with no errors.

#### Misc

- **`pull:*`** — Fetch external inputs (OpenAPI schemas, translations, auth context, etc.). Local transformation belongs to `generate` or `codegen`; make any fetch-then-generate dependency explicit instead of hiding network access inside an ordinary build.
- **`upgrade:deps`** — Update dependencies.

### Naming Rules

- A colon means specialization of an existing command. `test:fast`, `test:slow`, and `test:e2e` specialize `test`; `build:lib` specializes `build`; `generate:images` specializes `generate`. Prefer these standard entry points for everyday development: `dev`, `generate`, `codegen`, `build`, `build:lib`, `test`, `pull:*`, and `upgrade:deps`. Document additional commands when a distinct operation or tool contract needs them, including their purpose, prerequisites, and side effects. Preserve names required by package managers, runtimes, or deployment tools, such as lifecycle hooks or a production `start`; do not force them into an unrelated standard command.
- Environment is passed via variables, never encoded in the script name. No `dev:fast`, `build:prod`, `test:ci`.

### Complex Orchestration

When a script grows past a single command — multiple steps, parallelism, dependencies, conditions, intermediate variables — it moves to `Taskfile.yaml`. The `package.json` script becomes a thin entry point that delegates:

In a Turborepo workspace, Turbo alone owns dependencies between packages; Taskfile owns steps within a package. Declare package dependencies in workspace manifests and task ordering in `turbo.json`. A package-local Taskfile must not independently build sibling packages with `pnpm --filter ... build` or start another Turbo graph from a task Turbo is already running. A root entry point may invoke Turbo once; a targeted build that also needs dependency builds enters that same root graph with an explicit package/dependency filter, not a second Taskfile dependency graph.

For example, keep build and explicit refresh separate in `package.json`:

```json
{
  "scripts": {
    "build": "pnpm dm exec task -- build",
    "generate": "pnpm dm exec task -- generate"
  }
}
```

The build path does not call the committed-file refresh. A project may add the applicable script subset and task dependencies it needs.

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

- Turbo owns cross-package dependency ordering through `dependsOn: ["^build"]`; package-local Taskfile steps must not repeat those dependency builds.
- `"cache": false` for non-cacheable tasks (`dev`, `pull:*`).
- `"persistent": true` for long-running tasks (`dev`, `dev:mock`, `test:watch`).
- `"outputs"` for cacheable build artifacts (`dist/**`, `.next/**`, etc.).
- The root `test` graph covers every package's main unit/integration suite. Wire E2E and visual/screenshot suites as separate tasks or CI jobs by default; include them in `test` only by explicit documented project decision. Separate root and package orchestration so an aggregate does not invoke itself. Filters and `test:fast` narrow the main-suite graph explicitly, never by an implicit default.
- Include all generator inputs and configuration in cache keys and all outputs in `outputs` when caching generation. Cacheability does not make an explicit committed-file refresh an automatic build dependency.

### Anti-Patterns

DO NOT:

- Rename a standard everyday operation to an arbitrary alias, or hide a distinct operation under the wrong standard name. Document justified extensions and tool-required names instead; production startup, migrations, packaging, signing, and publication must not be disguised as development startup or ordinary builds. Naming exceptions do not authorize running side-effecting operations or override the separate cleanup rule below.
- Chain commands with `&&` in `package.json`. Move to Taskfile.
- Write `.sh` scripts for orchestration. Move to Taskfile.
- Use Makefiles. Use Taskfile.
- Encode environment in the script name. Use variables.
- Add a `clean` script. Use `git clean -fdx`.
