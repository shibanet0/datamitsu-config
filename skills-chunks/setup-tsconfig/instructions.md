# Setup TypeScript Config

Configure or fix `tsconfig.json` to extend the `@shibanet0/datamitsu-config/tsconfig/*` preset specified by `.datamitsu/tsconfig.md`.

`.datamitsu/tsconfig.md` is the source of truth for project-to-preset mapping. Regenerated from the central `datamitsu-config` repository, it may be newer than this skill. When in doubt, follow its table and warnings.

Writing `tsconfig.json` is destructive. Always propose → confirm → apply; never write without explicit confirmation.

---

## Step 1 — Read the source of truth

1. Read `.datamitsu/tsconfig.md` from the project root.
2. If the file is missing, abort:
   > `.datamitsu/tsconfig.md` not found. Run `pnpm dm init` (or your equivalent) to regenerate `.datamitsu/`, then re-run this skill.
3. Parse "Quick Selection": project type + monorepo flag → preset filename.
4. Parse "Configuration Descriptions": additions to `base.json` by preset.
5. Parse "Common Mistakes" for Step 3's negative checks.

Read the preset list every run; never hardcode it from memory. Honor additions and removals in `.datamitsu/tsconfig.md` automatically.

---

## Step 2 — Inspect the project

Read in parallel where possible:

**`package.json` (project root):**

- `dependencies` + `devDependencies` + `peerDependencies` — look for: `next`, `react`, `react-dom`, `vite`, `express`, `fastify`, `hono`, `@nestjs/core`, `aws-lambda`, `@aws-sdk/*`, `@pulumi/pulumi`, `@pulumi/*`, `@cloudflare/workers-types`, `wrangler`, `vitest`, `playwright`, `@playwright/test`, `tsx`, `tsdown`, `tsup`.
- `bin` field — CLI tool.
- `main` / `module` / `exports` / `types` fields — library that publishes artifacts.
- `private: true` + `workspaces` field — monorepo root.
- `react` in `peerDependencies` but not `dependencies` strongly suggests a React library.

**Workspace detection (monorepo or not):**

- Walk up from the project to the nearest `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`, or parent `package.json` with `workspaces`.
- If found, classify the project as a monorepo package if its `package.json` is a workspace member.
- Monorepo library presets: `library.json` → `shared-library.json`, `react-library.json` → `shared-react-library.json`.

**File markers (project root):**

- `next.config.{js,mjs,ts,cjs}` → Next.js app
- `vite.config.{js,mjs,ts,cjs}` → Vite-based app
- `Pulumi.yaml` / `Pulumi.*.yaml` at the root → Pulumi IaC project
- `wrangler.toml` / `wrangler.jsonc` → Cloudflare Workers service
- `astro.config.*` → Astro app (not in the table — flag, do not auto-pick a preset)
- `playwright.config.*` without app code under `src/` → E2E test project
- `index.html` at the root with a Vite config → SPA

**Existing `tsconfig.json`:**

- If present, read and record `extends`, `compilerOptions.types`, `compilerOptions.jsx`, `compilerOptions.noEmit`, `compilerOptions.composite`, `include`, `exclude`.
- `extends` matching `@shibanet0/datamitsu-config/tsconfig/*.json` identifies the current preset.
- Note any other `extends` (`@tsconfig/*`, local file, or absent) as a replacement candidate.

**Source code spot-check (only if needed to disambiguate):**

- If `package.json` cannot distinguish service from library, grep `src/` for `node:` imports. Such imports without React strongly suggest `service.json`.

Read only what's needed to decide.

---

## Step 3 — Pick the preset

Apply `.datamitsu/tsconfig.md` to the signals in this order:

1. **Pulumi / IaC** (root `Pulumi.yaml`/`Pulumi.*.yaml` or `@pulumi/*` dependency) → `infra-pulumi.json`. Standalone (no `base.json`); only this preset permits non-erasable syntax. Pulumi's ts-node runtime supports decorators/`enum`.
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
9. **Unclear** → do not guess. Ask the user for the project category, then decide again.

### Apply the "Common Mistakes" checks

Before finalizing, check the negative rules in `.datamitsu/tsconfig.md`:

- **DOM types in Node.** Without React deps, switch `react-library.json`/`shared-react-library.json` to `library.json`/`shared-library.json` respectively. Note the correction.
- **`library.json` in a monorepo.** For project references, switch `library.json` to `shared-library.json`; likewise `react-library.json` → `shared-react-library.json`.
- **Missing `types: ["node"]`.** For `base.json` or any library preset with `node:*` source imports, add `compilerOptions.types: ["node"]` to the `tsconfig.json` overrides.
- **Node types in Workers.** With `wrangler.*` or `@cloudflare/workers-types`, replace `service.json` with `service-worker.json`. Workers lack `@types/node` globals like `process` and `Buffer`.
- **TypeScript version.** Report `typescript` in devDependencies if `< 6.0.0`; `.datamitsu/tsconfig.md` requires TS 6.0+. Never auto-bump. Never recommend `typescript@latest`: it resolves to 7.x, a Go compiler without a JavaScript compiler API, unsupported by all released typescript-eslint versions (`typescript >=4.8.4 <6.1.0`). Recommend `typescript@^6` unless the user specifically asks for 7.
- **Redundant `@typescript/native-preview`.** Flag it or a `tsgo` script as superseded if present: TypeScript 7 is the native compiler. Leave removal to the user; do not edit it.

### Compute the override block

For `@shibanet0/datamitsu-config/tsconfig/*`, default to:

```json
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/<preset>.json"
}
```

Only add `compilerOptions` overrides when one of these applies:

- `types: ["node"]` required (per the mistake check above).
- Project layout deviates from `src/` → `dist/` and needs explicit `rootDir`/`outDir`.
- `include`/`exclude` need to deviate from the preset defaults (e.g., include a generated `.d.ts` file).

Never restate preset defaults. "Explicit Configuration" belongs in the preset, not the consumer.

---

## Step 4 — Propose

Present this exact report structure. Do not write yet.

```markdown
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

- TypeScript version is `<x.y.z>`, preset requires >= 6.0.0. Update with `pnpm add -D typescript@^6`.
- <if @typescript/native-preview or a tsgo script is present:> `@typescript/native-preview` is superseded by TypeScript 7 and can be dropped.
- Source imports `node:*` but `types: ["node"]` was not previously set. Will add it.
- Existing `tsconfig.json` had `<surprising option>` that the preset does not include. Will be removed unless you object.

### Diff

<unified diff of current vs proposed tsconfig.json, or full file if creating new>

Apply changes? Reply: yes / no / show details
```

- `show details`: print the full proposed file and the chosen preset's excerpt from `.datamitsu/tsconfig.md`. Ask again.
- `no`: abort without writing.
- `yes`: proceed to Step 5.

---

## Step 5 — Apply

After explicit `yes`:

1. Write the new `tsconfig.json`.
2. Preserve clearly intentional keys from the existing `tsconfig.json` that do not duplicate the preset: `references`, `files`, custom `include` patterns (e.g., generated `.d.ts` paths), `ts-node`/`tsx` sections.
3. Drop keys matching preset values.
4. Sort `compilerOptions` alphabetically. Follow project `tsconfig.json` root key order: `$schema`, `extends`, `compilerOptions`, `include`, `exclude`, `references`, `files`.
5. Do not create backups; Git is the backup.

Leave other configs (`tsconfig.eslint.json`, `tsconfig.build.json`, monorepo package configs) untouched unless explicitly requested. Each needs a separate run.

---

## Step 6 — Report

After writing, print:

```markdown
Done.

tsconfig.json: <created | updated>
Preset: `@shibanet0/datamitsu-config/tsconfig/<preset>.json`

Next steps:

- Run `pnpm tsc --noEmit` to verify the new config compiles.
- <if monorepo + shared-*:> Add a `references` entry from consumer packages to this package.
- <if TS version was flagged:> Update TypeScript: `pnpm add -D typescript@^6`.
```

---

## What this skill does NOT do

- Never install or update TypeScript; the version check is informational.
- Edit only tsconfig, not `package.json`, `tsdown.config.*`, bundler configs, ESLint configs, or other files.
- Recommend monorepo project `references` but leave setup to the user; wiring depends on the dependency graph.
- Never delete or modify alternate configs (`tsconfig.build.json`, etc.).
- Use relative paths; `.datamitsu/tsconfig.md` presets intentionally avoid path aliases. Do not add them.
- Treat `.datamitsu/` as read-only.

---

## Edge cases

**No `package.json` in project root.** Abort: "No `package.json` found. This skill expects a Node/TypeScript project."

**Multiple root `tsconfig*.json` files.** Target only `tsconfig.json`. If absent but `tsconfig.base.json` exists, report it. Ask whether to create `tsconfig.json` as a thin extender of the picked preset or modify `tsconfig.base.json` instead.

**JSON5 `tsconfig.json` with comments.** Edit as text rather than re-serializing to preserve comments where possible. Make minimal textual edits when adding/removing overrides.

**Correct preset, no warnings.** Print: "tsconfig.json already extends the correct preset. Nothing to do." Exit cleanly.

**Monorepo package wants standalone behavior** (e.g., independently published from a turborepo). Report monorepo detection in the proposal; let the user override the preset in their reply.

**Mixed React + server framework signals** (e.g., Next.js API routes). Next.js wins: use `nextjs.json`. Its plugin handles client and server.

**Astro / SvelteKit / SolidStart / other unlisted frameworks.** Do not pick a preset. Name the detected framework and ask the user to choose manually from the table or open a `datamitsu-config` issue to add a preset.

---

## Interaction style

- Keep reports terse and scannable, not narrative.
- Quote the "Quick Selection" row verbatim to justify the preset.
- Keep "why" to one line; do not repeat preset additions from `.datamitsu/tsconfig.md`.
- Never apologize for warnings; state facts without assigning blame.
