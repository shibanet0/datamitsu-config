# Setup TypeScript Config

You are about to configure or fix `tsconfig.json` in this project so that it extends the correct preset from `@shibanet0/datamitsu-config/tsconfig/*` according to the rules in `.datamitsu/tsconfig.md`.

`.datamitsu/tsconfig.md` is the **source of truth** for which preset applies to which project type. It is regenerated from the central `datamitsu-config` repository and may be more current than these instructions — when in doubt, defer to its preset table and warnings.

This skill is destructive — it writes `tsconfig.json`. Always follow the propose → confirm → apply order. Never apply without explicit confirmation.

---

## Step 1 — Read the source of truth

1. Read `.datamitsu/tsconfig.md` from the project root.
2. If the file is missing, abort:
   > `.datamitsu/tsconfig.md` not found. Run `pnpm dm init` (or your equivalent) to regenerate `.datamitsu/`, then re-run this skill.
3. Parse the "Quick Selection" table — it maps project type + monorepo flag → preset filename.
4. Parse the "Configuration Descriptions" section — it lists what each preset adds on top of `base.json`.
5. Parse the "Common Mistakes" section — these are the negative checks you will apply in Step 3.

Do **not** hardcode the preset list from memory. Read it from the file every run. If `.datamitsu/tsconfig.md` adds a new preset or removes one, this skill must pick that up automatically.

---

## Step 2 — Inspect the project

Gather these signals (do all reads in parallel where possible):

**`package.json` (project root):**

- `dependencies` + `devDependencies` + `peerDependencies` — look for: `next`, `react`, `react-dom`, `vite`, `express`, `fastify`, `hono`, `@nestjs/core`, `aws-lambda`, `@aws-sdk/*`, `@pulumi/pulumi`, `@pulumi/*`, `@cloudflare/workers-types`, `wrangler`, `vitest`, `playwright`, `@playwright/test`, `tsx`, `tsdown`, `tsup`.
- `bin` field — CLI tool.
- `main` / `module` / `exports` / `types` fields — library that publishes artifacts.
- `private: true` + `workspaces` field — monorepo root.
- `peerDependencies` containing `react` (without it being in `dependencies`) — strong signal of a React library.

**Workspace detection (monorepo or not):**

- Walk up from the project to find the nearest of: `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`, or a parent `package.json` with a `workspaces` field.
- If found and the current `package.json` is one of the workspace members, this is a **package inside a monorepo**.
- The monorepo flag affects library presets: `library.json` → `shared-library.json`, `react-library.json` → `shared-react-library.json`.

**File markers (project root):**

- `next.config.{js,mjs,ts,cjs}` → Next.js app
- `vite.config.{js,mjs,ts,cjs}` → Vite-based app
- `Pulumi.yaml` / `Pulumi.*.yaml` at the root → Pulumi IaC project
- `wrangler.toml` / `wrangler.jsonc` → Cloudflare Workers service
- `astro.config.*` → Astro app (not in the table — flag, do not auto-pick a preset)
- `playwright.config.*` without app code under `src/` → E2E test project
- `index.html` at the root with a Vite config → SPA

**Existing `tsconfig.json`:**

- If present, read it. Capture the current `extends`, `compilerOptions.types`, `compilerOptions.jsx`, `compilerOptions.noEmit`, `compilerOptions.composite`, `include`, `exclude`.
- If `extends` already points to a `@shibanet0/datamitsu-config/tsconfig/*.json`, that is the current preset.
- If `extends` points to anything else (`@tsconfig/*`, a local file, nothing), note it — this is a candidate for replacement.

**Source code spot-check (only if needed to disambiguate):**

- If you cannot tell service vs library from `package.json` alone, grep for `node:` imports in `src/` — their presence + no React strongly suggests `service.json`.

Do **not** read more files than needed to make the call. The signals above are usually enough.

---

## Step 3 — Pick the preset

Apply the rules from `.datamitsu/tsconfig.md` to the signals you gathered. The canonical decision order:

1. **Pulumi / IaC** (`Pulumi.yaml`/`Pulumi.*.yaml` at the root, or `@pulumi/*` in deps) → `infra-pulumi.json`. This is a **standalone** preset (does not extend `base.json`) and is the **only** preset that permits non-erasable syntax — Pulumi compiles via its own ts-node runtime, so decorators/`enum` are legal here.
2. **Next.js** (any `next.config.*` or `next` in deps) → `nextjs.json`.
3. **React library** (peerDep on `react` + no app markers + has `main`/`exports`):
   - monorepo → `shared-react-library.json`
   - standalone → `react-library.json`
4. **React app** (dep on `react` + Vite/CRA markers, no `peerDep` on react) → `base.json`.
5. **Backend service** (server framework dep, or Lambda/serverless markers, or `node:*` imports without React):
   - Cloudflare Workers (`wrangler.toml`/`wrangler.jsonc`, or `@cloudflare/workers-types` in deps) → `service-worker.json`
   - otherwise (Node.js runtime) → `service.json`
6. **Node library** (publishes artifacts via `exports`/`main`/`types`, no React, no server framework):
   - monorepo → `shared-library.json`
   - standalone → `library.json`
7. **Node CLI** (`bin` field, no other strong signals):
   - if it imports `node:*` heavily → `service.json`
   - otherwise → `base.json`
8. **E2E tests** (only test code, no app source) → `base.json`.
9. **Cannot determine** → do not guess. Ask the user which category their project falls into and re-run the decision with that input.

### Apply the "Common Mistakes" checks

Before finalizing the preset, validate against the negative rules in `.datamitsu/tsconfig.md`:

- **DOM types in a Node project.** If picked preset is `react-library.json`/`shared-react-library.json` but no React deps exist, downgrade to `library.json`/`shared-library.json` and note the correction.
- **`library.json` in a monorepo.** If picked preset is `library.json` but the project is inside a monorepo, upgrade to `shared-library.json` (so project references work). Same for `react-library.json` → `shared-react-library.json`.
- **Missing `types: ["node"]`.** If the picked preset is `base.json` or one of the library presets, but the source imports `node:*` modules, add `compilerOptions.types: ["node"]` to the override block of `tsconfig.json`.
- **Node types in a Cloudflare Worker.** If the project has `wrangler.*` or `@cloudflare/workers-types` but was assigned `service.json` (Node types), switch to `service-worker.json`. `@types/node` globals (`process`, `Buffer`, etc.) don't exist on the Workers runtime.
- **TypeScript version.** If `typescript` in devDependencies is `< 6.0.0`, flag it — `.datamitsu/tsconfig.md` requires TS 6.0+. Do not bump it automatically; surface it in the report so the user can update intentionally.

### Compute the override block

The presets in `@shibanet0/datamitsu-config/tsconfig/*` are designed to be extended with minimal overrides. Default to just:

```json
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/<preset>.json"
}
```

Only add `compilerOptions` overrides when one of these applies:

- `types: ["node"]` required (per the mistake check above).
- Project layout deviates from `src/` → `dist/` and needs explicit `rootDir`/`outDir`.
- `include`/`exclude` need to deviate from the preset defaults (e.g., include a generated `.d.ts` file).

Never add overrides that just restate the preset defaults. The "Explicit Configuration" philosophy lives **inside** the preset, not in each consumer.

---

## Step 4 — Propose

Build a report and present it to the user. Do not write yet.

Structure the report exactly like this:

```
## tsconfig setup plan

Detected project type: <human-readable label, e.g. "React library inside a pnpm monorepo">
Signals:
- <signal 1, e.g. "package.json peerDependencies: react ^19">
- <signal 2, e.g. "parent pnpm-workspace.yaml at ../../pnpm-workspace.yaml">
- <signal 3, e.g. "no next.config.* or vite.config.* found">

Picked preset: `@shibanet0/datamitsu-config/tsconfig/<preset>.json`
Why: <one-sentence justification, citing the row in the table>

### Current tsconfig.json

<one of:>
- Does not exist — will create.
- Extends `<current extends>` — will switch to `<picked preset>`.
- Already extends `<picked preset>` — no `extends` change needed.

### Override block (compilerOptions etc.)

<show the exact JSON that will be written, or "none — preset defaults are sufficient">

### Warnings

<list any of these that apply; omit section if none:>
- TypeScript version is `<x.y.z>`, preset requires >= 6.0.0. Update with `pnpm add -D typescript@latest`.
- Source imports `node:*` but `types: ["node"]` was not previously set. Will add it.
- Existing `tsconfig.json` had `<surprising option>` that the preset does not include. Will be removed unless you object.

### Diff

<unified diff of current vs proposed tsconfig.json, or full file if creating new>

Apply changes? Reply: yes / no / show details
```

If the user replies `show details`, print the full proposed file content and the relevant excerpt from `.datamitsu/tsconfig.md` for the chosen preset. Then ask again.

If the user replies `no`, abort. Do not write anything.

If the user replies `yes`, proceed to Step 5.

---

## Step 5 — Apply

After explicit `yes`:

1. Write the new `tsconfig.json` content.
2. Preserve any keys from the existing `tsconfig.json` that are clearly user intent and not preset duplication: `references`, `files`, custom `include` patterns (e.g., generated `.d.ts` paths), `ts-node`/`tsx`-specific sections.
3. Drop keys that the preset already sets to the same value — the philosophy is explicit-in-preset, minimal-in-consumer.
4. Sort `compilerOptions` keys alphabetically and root-level keys in this order: `$schema`, `extends`, `compilerOptions`, `include`, `exclude`, `references`, `files`. This matches the project's existing style (see the project's own `tsconfig.json`).
5. Do not create backup files. Git is the backup.

Do not touch any other tsconfig files in the repo (`tsconfig.eslint.json`, `tsconfig.build.json`, package-level configs in a monorepo) unless the user explicitly asked you to set those up too. Each is a separate run.

---

## Step 6 — Report

After writing, print a final summary:

```
Done.

tsconfig.json: <created | updated>
Preset: `@shibanet0/datamitsu-config/tsconfig/<preset>.json`

Next steps:
- Run `pnpm tsc --noEmit` to verify the new config compiles.
- <if monorepo + shared-*:> Add a `references` entry from consumer packages to this package.
- <if TS version was flagged:> Update TypeScript: `pnpm add -D typescript@latest`.
```

---

## What this skill does NOT do

- Does **not** install or update TypeScript itself. The version check is informational.
- Does **not** modify `package.json`, `tsdown.config.*`, bundler configs, ESLint configs, or any other file. tsconfig only.
- Does **not** set up project `references` in a monorepo. Reports the recommendation; the user wires the references because correct wiring requires knowing the dependency graph.
- Does **not** delete or modify alternate tsconfig files (`tsconfig.build.json`, etc.).
- Does **not** add path aliases. Per `.datamitsu/tsconfig.md`, the presets intentionally avoid path aliases — use relative paths.
- Does **not** modify anything under `.datamitsu/`. That directory is read-only from this skill's perspective.

---

## Edge cases

**No `package.json` in project root.** Abort: "No `package.json` found. This skill expects a Node/TypeScript project."

**Multiple `tsconfig*.json` files in root.** Operate only on `tsconfig.json`. If it does not exist but `tsconfig.base.json` does, surface it in the report and ask whether the user wants `tsconfig.json` created as a thin extender of the picked preset, or whether `tsconfig.base.json` should be modified instead.

**`tsconfig.json` is a JSON5 file with comments.** Preserve user comments where possible by treating the file as text rather than re-serializing. If overrides need to be added/removed, do minimal textual edits.

**Project already has the correct preset and no warnings apply.** Print: "tsconfig.json already extends the correct preset. Nothing to do." Exit cleanly.

**Project is inside a monorepo but the user wants standalone behavior** (e.g., the package is published independently from a turborepo). Surface the monorepo detection in the proposal and let the user override the preset choice when they reply.

**Mixed signals (React + server framework, e.g. Next.js API routes).** Next.js wins — use `nextjs.json`. The Next plugin handles both client and server.

**Astro / SvelteKit / SolidStart / other frameworks not in the table.** Do not pick a preset. Report the detected framework and ask the user to either pick manually from the table or open an issue against `datamitsu-config` to add a preset.

---

## Interaction style

- Be terse. Reports are scannable, not narrative.
- Quote the row of the "Quick Selection" table verbatim when justifying a preset choice.
- One-line "why" justifications. Do not restate what the preset adds — the user can read `.datamitsu/tsconfig.md`.
- Never apologize for warnings. They are facts, not the author's failure.
