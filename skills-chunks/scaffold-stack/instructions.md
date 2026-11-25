# Scaffold Preferred Stack

Use the preferred stack to scaffold a project, app or library, or add a major dependency to an existing one.

Library source of truth: the catalogue linked from `## Preferred Stack` in the loaded agent rules (`.datamitsu/ai/agents/*.md`, referenced by the project's `AGENTS.md`). Never hardcode the catalogue or reconstruct it from memory. Apply `## Single Source for Constants, Env & Build Inputs` to everything scaffolded.

Propose → confirm → apply. Never install dependencies or write files without explicit confirmation.

---

## Step 1 — Read the source of truth

1. Find `## Preferred Stack` in the loaded rules. If absent, abort:
   > Preferred Stack rules not found in the loaded agent rules. Ensure `AGENTS.md` references `.datamitsu/ai/agents/*.md` and run `pnpm dm init` to regenerate `.datamitsu/`, then re-run this skill.
2. On every run, resolve the catalogue link's href in the loaded `## Preferred Stack` section relative to the consumer project root and open the resulting file. Reading it requires neither reconciliation nor an adapter. If the href is missing or the file cannot be read, abort:
   > Run `pnpm dm init` (or `datamitsu init` without a pnpm stack), verify that the loaded Preferred Stack rule links to a readable catalogue, then re-run this skill.
3. Use the relevant catalogue picks unless the project overrides them. Apply the loaded Version Policy, Invocation, Monorepo, and security rules and bans.

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

Before proposing scripts, read the full contract linked from `## Project Scripts` in the loaded rules; resolve its path from the project root. Propose only relevant scripts per package and document each command's purpose, prerequisites, and side effects. Identify required generated outputs and name the explicit refresh command for any committed outputs. Script names do not authorize execution.

- `no` → abort, write nothing.
- `show details` → print full file contents / exact commands, then ask again.
- `yes` → Step 5.

---

## Step 5 — Apply

After explicit `yes`:

1. Run the scaffold/install commands exactly as proposed.
2. Create the `package.json` wrapper with only the proposed scripts, following the Project Scripts contract linked in Step 4. Invoke `Taskfile.yaml` tasks via `pnpm dm exec task -- <task>` (direct mode: `datamitsu exec task -- <task>`).
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
