## Project Scripts

Every package in the repository — regardless of language (TypeScript, Go, Python, Rust, Swift, Kotlin) — exposes a `package.json` with a unified set of scripts. This makes project entry points identical across the monorepo: the same command names work everywhere, and `turbo` orchestrates them from the root.

### Promise

Any package in this monorepo runs with `pnpm install && pnpm dev`, regardless of the language inside. New contributors do not need to learn the underlying toolchain (Go, Rust, Python, Swift) to start the happy path. Toolchain-specific knowledge is required only when working on optimizations, edge cases, or build internals.

### Standard Scripts

Implement the relevant subset in each package. Names and meanings are fixed.

#### Run

- **`dev`** — Start everything required for the package to run: dev server, backend, infrastructure containers (without `-d`), workers. From the monorepo root, `dev` brings the whole project up. Persistent.
- **`dev:mock`** — Same as `dev`, with external dependencies mocked. Optional. Persistent.

#### Build

- **`codegen`** — Generate code from schemas: SDKs from OpenAPI/GraphQL/protobuf, DB types, i18n types. Idempotent.
- **`build:lib`** — Preparatory steps required before `dev` or `build`: asset prelinking, intermediate internal libraries, static preparation. Depends on `codegen`.
- **`build`** — Final application or library build. Depends on `build:lib`. Same name regardless of target (SPA, binary, npm package, WebAssembly artifact).

#### Test

- **`test`** — Fast tests: units, integration without infrastructure.
- **`test:watch`** — `test` in watch mode. Persistent. Fast tests only.
- **`test:coverage`** — Run tests with coverage collection.
- **`test:e2e`** — End-to-end tests: real browser, testcontainers, full infrastructure.
- **`test:e2e:ui`** — UI mode for the e2e runner, where supported.
- **`test:e2e:install`** — Install e2e runner dependencies (e.g., browsers). Idempotent.
- **`test:snapshots`** — Visual / screenshot tests.
- **`test:snapshots:update`** — Update screenshot baselines.
- **`test:update`** — Update inline snapshots.

#### Quality

Always run `pnpm dm check` after completing a task. This runs fixers (formatters, auto-fixes) followed by linters (type checking, ESLint). It should complete with no errors.

#### Misc

- **`pull:*`** — Fetch external artifacts (OpenAPI schemas, auth context, etc.).
- **`upgrade:deps`** — Update dependencies.

### Naming Rules

- A colon means specialization of an existing command. `test:e2e` is a kind of `test`. `build:lib` is a kind of `build`. New top-level names are not introduced.
- Environment is passed via variables, never encoded in the script name. No `dev:fast`, `build:prod`, `test:ci`.

### Complex Orchestration

When a script grows past a single command — multiple steps, parallelism, dependencies, conditions, intermediate variables — it moves to `Taskfile.yml`. The `package.json` script becomes a thin entry point that delegates:

```json
{
  "scripts": {
    "build": "pnpm dm exec task -- build",
    "build:lib": "pnpm dm exec task -- build:lib"
  }
}
```

The standard names above never change — only what they delegate to.

#### Taskfile Conventions

- Every task has a `desc` field.
- `deps` for parallel prerequisites, `cmds` for sequential steps.
- Namespacing matches script names: `build:*`, `test:*`, `dev:*`.

```yaml
version: "3"

tasks:
  build:
    desc: Full application build
    deps: [build:lib]
    cmds:
      - pnpm exec tsdown

  build:lib:
    desc: Generate SDK and build internal libraries
    deps: [codegen]
    cmds:
      - pnpm --filter @scope/shared build

  codegen:
    desc: Generate types from OpenAPI schema
    sources: [schema.yaml]
    generates: [src/generated/api.ts]
    cmds:
      - pnpm exec openapi-typescript ./schema.yaml -o ./src/generated/api.ts
```

### Turborepo

Pipeline tasks are declared in `turbo.json`:

- `dependsOn: ["^build"]` for cross-package dependency ordering.
- `"cache": false` for non-cacheable tasks (`dev`, `pull:*`).
- `"persistent": true` for long-running tasks (`dev`, `dev:mock`, `test:watch`).
- `"outputs"` for cacheable build artifacts (`dist/**`, `.next/**`, etc.).

### Anti-Patterns

DO NOT:

- Invent script names outside the standard list (`start`, `serve`, `compile`, `unit`, `typecheck`, `check`, `lint:fix`, `start:dev`).
- Chain commands with `&&` in `package.json`. Move to Taskfile.
- Write `.sh` scripts for orchestration. Move to Taskfile.
- Use Makefiles. Use Taskfile.
- Encode environment in the script name. Use variables.
- Add a `clean` script. Use `git clean -fdx`.
