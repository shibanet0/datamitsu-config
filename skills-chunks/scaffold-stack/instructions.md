# Scaffold Preferred Stack

You are about to scaffold a new project/app/library — or add a major dependency to an existing one — using the preferred stack for this ecosystem.

The **source of truth** for library choices is the `## Preferred Stack` section of the agent rules already loaded in this session (from `.datamitsu/ai/agents/*.md`, referenced by the project's `AGENTS.md`). Do NOT hardcode the catalogue into this skill or reconstruct it from memory — read it from the loaded rules every run so it stays current as the catalogue evolves. The `## Single Source for Constants, Env & Build Inputs` rules apply to everything you scaffold.

This skill installs dependencies and writes files. Always follow the propose → confirm → apply order. Never install or write without explicit confirmation.

---

## Step 1 — Read the source of truth

1. Locate the `## Preferred Stack` section in the loaded agent rules. If it is not present, abort:
   > Preferred Stack rules not found in the loaded agent rules. Ensure `AGENTS.md` references `.datamitsu/ai/agents/*.md` and run `pnpm dm init` to regenerate `.datamitsu/`, then re-run this skill.
2. Note the picks relevant to what you are about to build (Web / Node / Go / Testing / Docs / Monorepo), the Version Policy, the Invocation rule, and the bans (e.g. Tailwind is forbidden).

Do **not** hardcode the catalogue. If it gains or drops a library, this skill must pick that up automatically by re-reading the loaded rules.

---

## Step 2 — Understand the request and detect context

Determine WHAT is being scaffolded and WHERE:

- **Target kind:** Go service, Node service, Vite + React web app, shared library, monorepo root, or docs (Typst / Slidev). Ask the user if genuinely ambiguous.
- **Invocation mode:** is there a pnpm stack wired with this config (a `package.json` exposing the `dm`/`datamitsu` bin, a `pnpm-workspace.yaml`, or an existing `.datamitsu/`)?
  - Yes → drive managed tools via `pnpm dm exec <tool>`.
  - No → drive the system-installed `datamitsu` binary directly, or offer to initialize a pnpm stack first if the target belongs in one.
- **Monorepo:** if inside (or creating) a Turborepo + pnpm workspace, every package — including Go and Rust — needs a `package.json` with relevant scripts so `turbo run <script>` can orchestrate it; prefer standard names for everyday operations. Confirm placement.

---

## Step 3 — Resolve versions

For every library you intend to add, apply the Version Policy:

1. If it is already used elsewhere in the repo, reuse that exact version.
2. Otherwise, check the CURRENT latest stable release from the registry (npm, the Go module proxy, crates.io) — do not guess a major from memory. Record the resolved version.
3. Never introduce an unmaintained/EOL package or a stale major. If a catalogue pick looks abandoned at scaffold time, stop and flag it to the user rather than silently substituting.

---

## Step 4 — Propose

Present a plan and do not write yet. Structure it:

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

Prefer standard package script names for everyday operations and propose only the relevant subset, not every script for every package. Allow documented commands for distinct operations and names required by the package manager, runtime, or deployment (e.g. production `start`, lifecycle hooks, migrations, package/sign/publish). Document each command's purpose, prerequisites, and side effects; never hide publish in `build` or production start in `dev`. Script names do not authorize execution.

- `generate` / `generate:*`: explicitly refresh committed generated outputs, including source files. `codegen` / `codegen:*`: produce source code and are called under `generate` for committed generated code or under build preparation only for disposable build outputs. Identify required outputs and name their explicit `generate` / `generate:*` refresh commands when committed; do not name `codegen` alone as their refresh command. Committed generated files must not be automatic build/dev/install prerequisites; missing required committed outputs should tell the user which explicit `generate` / `generate:*` refresh command to run.
- `test`: the complete main unit/integration suite, including expensive members, which can be slow in aggregate even when individual tests are fast. Keep E2E and visual snapshot suites separate as `test:e2e` and `test:snapshots` by default; include them in `test` only by an explicit documented project decision. Ordinary text/object/inline snapshot assertions remain in their corresponding main unit/integration suite. `test:fast`: a subset with a project-appropriate elapsed-time budget measured for the whole command at its intended package or root scope, including preparation and orchestration. State runner resources, parallelism, and cold/warm cache conditions for that measurement. The budget is not a per-test duration or a unit-test label; do not impose a universal numeric runtime cutoff. Optional `test:slow`: expensive main-suite members, still included in `test`, not the complement of `test:fast`. E2E is a test type, not a speed tier.
- Put package-local multi-step orchestration in `Taskfile.yaml` and keep package scripts as thin entry points. For monorepos, Turbo alone owns the cross-package task/dependency graph through workspace manifests and `turbo.json`; wire relevant scripts into that graph without introducing automatic refresh dependencies for committed generated files. Taskfile steps stay within their package: no sibling `pnpm --filter` builds duplicating Turbo, and no nested Turbo graph from Turbo-run package tasks. Route targeted dependency builds through the same root Turbo graph using a filter.

- `no` → abort, write nothing.
- `show details` → print full file contents / exact commands, then ask again.
- `yes` → Step 5.

---

## Step 5 — Apply

After explicit `yes`:

1. Run the scaffold/install commands exactly as proposed.
2. Create the `package.json` wrapper with only the proposed relevant scripts, preferring standard names for everyday operations while allowing documented distinct-operation commands and package manager/runtime/deployment required names (e.g. production `start`, lifecycle hooks, migrations, package/sign/publish). Document each command's purpose, prerequisites, and side effects; never hide publish in `build` or production start in `dev`. Script names do not authorize execution. Put package-local multi-step orchestration in `Taskfile.yaml`, invoked via `pnpm dm exec task -- <task>` (or `datamitsu exec task -- <task>` in direct mode). Apply the proposed Turbo wiring for monorepos: Turbo alone owns the cross-package task/dependency graph through workspace manifests and `turbo.json`. Taskfile steps stay within their package: no sibling `pnpm --filter` builds duplicating Turbo, and no nested Turbo graph from Turbo-run package tasks. Route targeted dependency builds through the same root Turbo graph using a filter. Preserve the proposed `generate`/`codegen` distinction: `generate` explicitly refreshes committed generated outputs, including source files; `codegen` produces source code and is called under `generate` for committed generated code or under build preparation only for disposable build outputs. Preserve `test` as the complete main unit/integration suite, including expensive members and ordinary text/object/inline snapshot assertions. Keep `test:e2e` and visual `test:snapshots` separate by default; include them in `test` only by an explicit documented project decision. Preserve the proposed whole-command `test:fast` budget, scope, preparation/orchestration, runner resources, parallelism, and cache conditions. Optional `test:slow` selects expensive main-suite members still included in `test`, not the complement of `test:fast`; E2E is a test type, not a speed tier. Do not make committed generated files automatic build/dev/install prerequisites; when required committed outputs are missing, report the explicit `generate` / `generate:*` refresh command, not `codegen` alone.
3. Set up the single env / constants / build-flag entry points per the Single Source rules — do not scatter `process.env` / `os.Getenv` / raw constants.
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

- Does NOT pick libraries outside the loaded Preferred Stack catalogue without telling the user. If a needed capability is not covered, surface it and ask.
- Does NOT introduce Tailwind or anything built on it — it is banned.
- Does NOT bump or change versions of libraries already pinned in the repo.
- Does NOT run `dm config reconcile` or mutate managed configs beyond what is proposed.

---

## Edge cases

- **Capability not in the catalogue.** Do not guess a trendy package. Propose the closest ecosystem fit, mark it "not in catalogue", and ask the user to confirm or add it to `datamitsu-config`.
- **Existing project already uses a non-preferred library** for the same concern. Keep it (the catalogue is a priority list, not a forced migration). Note the divergence in the report; migrate only if the user asks.
- **No pnpm stack and the target does not need one** (e.g. a standalone Go binary). Use the direct `datamitsu` binary; do not force a pnpm workspace onto it.
- **Ambiguous target kind.** Ask; do not scaffold on a guess.

---

## Interaction style

- Be terse. The plan is scannable, not narrative.
- Cite the catalogue pick you are applying; one-line justifications.
- Report resolved versions as facts; never invent a version you did not verify.
