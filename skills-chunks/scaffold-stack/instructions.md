# Scaffold Preferred Stack

Use the preferred stack to scaffold a project, app or library, or add a major dependency to an existing one.

Library source of truth: `## Preferred Stack` in the loaded agent rules (`.datamitsu/ai/agents/*.md`, referenced by the project's `AGENTS.md`). Read it every run to pick up catalogue changes; never hardcode it or reconstruct it from memory. Apply `## Single Source for Constants, Env & Build Inputs` to everything scaffolded.

Propose → confirm → apply. Never install dependencies or write files without explicit confirmation.

---

## Step 1 — Read the source of truth

1. Find `## Preferred Stack` in the loaded rules. If absent, abort:
   > Preferred Stack rules not found in the loaded agent rules. Ensure `AGENTS.md` references `.datamitsu/ai/agents/*.md` and run `pnpm dm init` to regenerate `.datamitsu/`, then re-run this skill.
2. Note relevant picks (Web / Node / Go / Testing / Docs / Monorepo), the Version Policy, the Invocation rule and bans (e.g. Tailwind).

---

## Step 2 — Understand the request and detect context

Identify the target and its location:

- **Target kind:** Go service, Node service, Vite + React web app, shared library, monorepo root, or docs (Typst / Slidev). Ask the user if genuinely ambiguous.
- **Invocation mode:** Check for a configured pnpm stack: a `package.json` exposing the `dm`/`datamitsu` bin, a `pnpm-workspace.yaml`, or an existing `.datamitsu/`.
  - Present: run managed tools via `pnpm dm exec <tool>`.
  - Absent: use the system-installed `datamitsu` binary directly, or offer to initialize a pnpm stack first if the target belongs in one.
- **Monorepo:** In a new or existing Turborepo + pnpm workspace, confirm placement. Every package, including Go and Rust, needs a `package.json` with relevant scripts for `turbo run <script>`; prefer standard names for everyday operations.

---

## Step 3 — Resolve versions

Apply the Version Policy to each library:

1. Reuse the exact version if used elsewhere in the repo.
2. Otherwise check the registry (npm, Go module proxy, crates.io) for the current latest stable release. Never guess a major from memory. Record the resolved version.
3. Never introduce unmaintained/EOL packages or stale majors. If a catalogue pick looks abandoned, stop and flag it to the user; do not silently substitute.

---

## Step 4 — Propose

Present this plan without writing files:

```markdown
## scaffold plan

Building: <e.g. "Vite + React + TS web app inside the existing pnpm monorepo">
Invocation: <pnpm dm exec | direct datamitsu>

Libraries (catalogue → resolved version):

- <lib> — <version> (<reused from repo | latest stable>)
- …

Structure:

- <files/dirs to create, package.json wrapper with relevant scripts, package-local Taskfile.yaml steps, root Turbo graph wiring>

Config inputs (per the Single Source rule):

- <env module / constants module / build-flag module to create, if any>

Commands to run:

- <exact install/scaffold commands>

Apply? Reply: yes / no / show details
```

Propose only relevant scripts per package. Prefer standard names for everyday operations; allow documented distinct operations and names required by the package manager, runtime or deployment (e.g. production `start`, lifecycle hooks, migrations, package/sign/publish). Document each command's purpose, prerequisites and side effects. Never hide publish in `build` or production start in `dev`. Script names do not authorize execution.

- `generate` / `generate:*`: explicitly refresh committed generated outputs, including source files. `codegen` / `codegen:*`: produce source code under `generate` for committed code, or under build preparation only for disposable outputs. Identify required outputs; for committed ones, name the explicit `generate` / `generate:*` refresh command, never `codegen` alone. Never make committed generated files automatic build/dev/install prerequisites. If required committed outputs are missing, tell the user which refresh command to run.
- `test`: complete main unit/integration suite, including expensive members and ordinary text/object/inline snapshot assertions in their corresponding suites. Even fast tests can be slow in aggregate. Keep E2E and visual snapshots separate as `test:e2e` and `test:snapshots` unless an explicit documented project decision includes them in `test`.
- `test:fast`: subset with a project-specific elapsed-time budget. Measure the whole command at its intended package or root scope, including preparation and orchestration. State runner resources, parallelism and cold/warm cache conditions. The budget is neither a per-test duration nor a unit-test label; no universal numeric cutoff. Optional `test:slow` selects expensive members still in `test`, not the complement of `test:fast`. E2E is a type, not a speed tier.
- Keep package scripts thin; put package-local multi-step orchestration in `Taskfile.yaml`. In monorepos, Turbo alone owns the cross-package task/dependency graph via workspace manifests and `turbo.json`. Wire relevant scripts into it without automatic refresh dependencies for committed generated files. Keep Taskfile steps local: no sibling `pnpm --filter` builds duplicating Turbo or nested Turbo graphs from Turbo-run tasks. Filter the same root Turbo graph for targeted dependency builds.

- `no` → abort, write nothing.
- `show details` → print full file contents / exact commands, then ask again.
- `yes` → Step 5.

---

## Step 5 — Apply

After explicit `yes`:

1. Run the scaffold/install commands exactly as proposed.
2. Create the `package.json` wrapper with only the proposed scripts. Apply all Step 4 rules for command names and documentation, generation and missing outputs, test suites and timing, package-local orchestration and monorepo Turbo wiring. Invoke `Taskfile.yaml` tasks via `pnpm dm exec task -- <task>` (direct mode: `datamitsu exec task -- <task>`).
3. Set up single env / constants / build-flag entry points per the Single Source rules; never scatter `process.env` / `os.Getenv` / raw constants.
4. Do not create backup files. Git is the backup.

---

## Step 6 — Report

```markdown
Done.

Scaffolded: <what>
Libraries: <lib@version, …>
Invocation: <mode>

Next steps:

- Run `pnpm dm check` (or `datamitsu check`) to fix + lint.
- <if monorepo:> add the new package to the workspace / turbo pipeline if needed.
- <if a runtime like Go/Rust is required:> ensure the toolchain is installed.
```

---

## What this skill does NOT do

- Never choose outside the loaded Preferred Stack catalogue without telling the user. Flag missing capabilities and ask.
- Never introduce Tailwind or anything built on it.
- Never bump or change pinned repo library versions.
- Never run `dm config reconcile` or mutate managed configs beyond the proposal.

---

## Edge cases

- **Missing capability:** Don't guess a trendy package. Propose the closest ecosystem fit, mark it "not in catalogue", and ask the user to confirm or add it to `datamitsu-config`.
- **Existing non-preferred library for the same concern:** Keep it. The catalogue sets priorities, not mandatory migrations. Report the divergence; migrate only on request.
- **No pnpm stack present or needed** (e.g. standalone Go binary): use `datamitsu` directly; do not force a pnpm workspace.
- **Ambiguous target kind:** Ask; never scaffold on a guess.

---

## Interaction style

- Keep the plan terse and scannable, not narrative.
- Cite each catalogue pick with a one-line justification.
- Report verified versions as facts; never invent one.
