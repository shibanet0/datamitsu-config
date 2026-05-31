---
name: sync-tsconfig-upstream
description: Reconcile this repo's TypeScript presets and guide against the upstream project they are based on (0x80/typescript-config). Reads the pinned commit from docs/reference/tsconfig.md ("Based on" line), makes a fresh clone, diffs the pinned commit against upstream HEAD, deeply analyses what changed and WHY (upstream commit messages, upstream docs, TS release notes), then proposes a plan to update tsconfig/*.json presets, the docs/reference/tsconfig.md guide, and the shared setup-tsconfig skill — waiting for explicit human confirmation before applying anything, and bumping the pinned commit on apply. Use whenever the user asks to sync/update/refresh the tsconfig presets from upstream, check for upstream TypeScript-config changes, or "see what 0x80 changed".
---

# Sync TypeScript Config From Upstream

This repo maintains a **curated, intentionally divergent fork** of the ideas in
[`0x80/typescript-config`](https://github.com/0x80/typescript-config). It is **not a mirror**:
file names differ, the preset set is smaller, and this repo has its own philosophy
(explicit configuration, bundler-centric, no path aliases — see `docs/reference/tsconfig.md`).

Your job in this skill is to **reconcile**, not copy. You detect what moved upstream since the
pinned commit, understand _why_ the upstream author made each change, and then help the human
decide — per change — whether to **adopt**, **adapt**, or **deliberately skip** it for this repo.

This skill is **read-only until the human says yes**. It performs deep analysis, proposes a plan,
and waits. It only writes files after explicit confirmation, and even then only the source-of-truth
files listed below.

## Source-of-truth map

Edit only these. Everything else is generated from them.

| File                                           | Role                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig/*.json`                              | The actual presets. Published directly as `@shibanet0/datamitsu-config/tsconfig/*`. No build step.                                    |
| `docs/reference/tsconfig.md`                   | The human-facing guide **and** the pinned upstream commit (the "Based on" line at the bottom).                                        |
| `skills-chunks/setup-tsconfig/instructions.md` | Source of the shared `setup-tsconfig` skill (the one distributed to consumer projects). Edit only if preset decision _rules_ changed. |

**Never hand-edit these — they are regenerated:**

- `src/datamitsu-config/tsconfig.md.ts` ← `docs/reference/tsconfig.md` (via `node scripts/gen-tsconfig-md.ts`)
- `src/datamitsu-config/skills.ts` ← `skills-chunks/` (via `node scripts/gen-skills.ts`)
- `.datamitsu/tsconfig.md` and anything else under `.datamitsu/` (rebuilt by `pnpm dm init`)

---

## Known local divergences — preserve these

These are deliberate differences between this repo's presets and the upstream **baseline** they were
forked from (`0x80/typescript-config` @ `2cca1bb`, v3.0.0). They are intentional design choices, **not**
upstream lag. When reconciling upstream changes, **never silently revert any of them** — if an upstream
commit touches one of these areas, treat it as a NEEDS DECISION and surface it explicitly.

This list is a snapshot. The skill must still re-derive divergences each run (that's its whole job);
it exists so an upstream change in one of these areas is flagged as colliding with a known choice.

**`base.json` — the most divergent preset:**

- **No path aliases.** Upstream `base.json` defines `compilerOptions.paths` (`~/*`, `@/*`); this repo
  **removed them** on purpose (see the "Path Aliases" section of `docs/reference/tsconfig.md`). **Never
  re-introduce `paths`** — if upstream changes/extends its aliases, that is a no-op for this repo.
- **Explicit-options set.** This repo adds a large set of options on top of upstream's leaner base, per
  the "explicit configuration" philosophy. Keep them even if upstream reformats or relies on TS defaults:
  `strict` (upstream's baseline does **not** even set this), `esModuleInterop`, `exactOptionalPropertyTypes`,
  `forceConsistentCasingInFileNames`, `isolatedModules`, `moduleResolution: "bundler"`,
  `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUncheckedSideEffectImports`,
  `resolvePackageJsonExports`, `resolvePackageJsonImports: false`, `types: []`,
  `useUnknownInCatchVariables`, `allowUnreachableCode: false`, `allowUnusedLabels: false`.
- **`exclude`** omits upstream's `${configDir}/isolate` entry.

**`nextjs.json`** adds on top of baseline: `exclude: ["${configDir}/node_modules"]`, `types: ["node"]`,
`noUncheckedSideEffectImports: false`.

**`service.json`** adds `types: ["node"]`; `display` is `"Backend service"` (upstream: `"Backend service / app"`).

**`library.json`** `display` is `"Standalone shared library"` (upstream: `"Standalone library (not part of a monorepo)"`).

**`react-library.json`, `shared-library.json`, `shared-react-library.json`** had **no** local divergence
from the baseline — they track upstream closely, so upstream changes to these are the safest to adopt.

---

## Guiding principles (decision bias)

These are this repo's **policy**, not upstream's call. They override the neutral adopt/adapt/skip stance
whenever a change touches them. Two priorities, in order:

### 1. Maximum strictness wins

Type-checking strictness is the top priority for this config family.

- **Enable every strictness flag that can be enabled** — default to the strictest setting, even beyond
  what upstream does.
- **Adopt** any upstream change that _tightens_ checks (a new strictness flag, a stricter default).
- **Skip and record** any upstream change that _loosens_ checks. Never weaken an existing strict setting
  just to match upstream.
- If you spot a strictness option that exists in TypeScript but is **missing** from our presets, surface
  it as a proactive recommendation in the plan — even if upstream doesn't set it.
- Relevant options (non-exhaustive; verify against current TS docs): `strict` and its members
  (`strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`,
  `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`), plus
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`,
  `allowUnreachableCode: false`, `allowUnusedLabels: false`.

### 2. Erasable-only TypeScript (no transpile-required syntax)

Source must run **directly under Node's type stripping** (`node --experimental-strip-types` / type
erasure) with **no transpiler**. Any TypeScript construct that emits runtime code is therefore forbidden,
and the ban is enforced at the type level. These options must stay **on**, and be **added** to any preset
missing them (this is an adopt-by-default, not a NEEDS DECISION):

- `erasableSyntaxOnly: true` — bans non-erasable syntax: `enum`, `namespace`/`module` with runtime
  members, parameter properties (`constructor(private x)`), `import =` / `export =`.
- `isolatedModules: true` — every file must compile and have its types stripped on its own, in isolation.
- `verbatimModuleSyntax: true` — explicit `import type`, no import-elision magic.

Treat any upstream change that **removes or weakens** these as a hard **skip**. Treat any upstream change
that introduces a **transpile-only** feature (e.g. `experimentalDecorators` / `emitDecoratorMetadata`
with runtime emit, or anything implying `enum`/`namespace` usage) as **skip** unless it is purely
type-level. The litmus test for any new construct/option: _"does the source still run unchanged after
`node` strips the types?"_ If no, reject it.

---

## Step 1 — Read the pin

1. Read `docs/reference/tsconfig.md`. Find the **"Based on"** section near the bottom. It looks like:

   ```
   [@codecompose/typescript-config](https://github.com/0x80/typescript-config/commit/<sha>) by 0x80.
   ```

2. From that single line, extract **both**:
   - the **repo URL** — everything before `/commit/` (e.g. `https://github.com/0x80/typescript-config`). Do not hardcode it; derive it so the skill survives a repo rename/move.
   - the **pinned commit SHA**.

3. If the line has no `/commit/<sha>` (the link points at the repo root, un-pinned), tell the user:

   > The "Based on" line in `docs/reference/tsconfig.md` is not pinned to a commit. I can't compute a diff without a baseline. Pin it to a known-good upstream commit first (or tell me which commit to treat as the baseline), then re-run.

   Stop and ask which commit to use as the baseline if they want to proceed anyway.

---

## Step 2 — Fresh clone + sanity checks

Clone into a throwaway temp directory (full clone — you need history for the diff, not `--depth 1`):

```bash
TMP="$(mktemp -d)"
git clone "<repo-url>" "$TMP/upstream"
git -C "$TMP/upstream" cat-file -t <pinned-sha>      # must print "commit"
git -C "$TMP/upstream" log -1 --format='%H %ci %s'   # upstream HEAD
git -C "$TMP/upstream" rev-list --count <pinned-sha>..HEAD   # commits since pin
```

- If `cat-file` fails, the pinned SHA no longer exists upstream (force-push / rebase). Report this and ask the human for a new baseline. Do not guess.
- If the count is `0`, report "Already up to date with upstream HEAD `<sha>` (`<subject>`). Nothing to reconcile." and stop cleanly.
- Record upstream HEAD SHA — this becomes the **new pin** if changes are applied.

Always clean up `$TMP` at the end (success or abort).

---

## Step 3 — Compute the raw diff

Gather, against the upstream's config directory (currently `src/`, but verify — upstream may relocate it):

```bash
git -C "$TMP/upstream" log --oneline --no-merges <pinned-sha>..HEAD
git -C "$TMP/upstream" diff --stat <pinned-sha>..HEAD
git -C "$TMP/upstream" diff <pinned-sha>..HEAD -- src/
```

Build three lists:

- **Changed** upstream config files (existed at pin, modified since).
- **Added** upstream config files (new presets).
- **Removed / renamed** upstream config files.

### Map upstream files → local presets

Upstream and local naming **diverge** and will keep diverging. Do **not** map by filename alone —
read each upstream file's `display` field and `compilerOptions` and match by _intent_. The mapping at
the time of writing (verify every run; treat as a hint, not gospel):

| Upstream file (`src/`)      | Local preset (`tsconfig/`)  | Notes                                  |
| --------------------------- | --------------------------- | -------------------------------------- |
| `base.json`                 | `base.json`                 | direct                                 |
| `library.json`              | `library.json`              | standalone node library                |
| `library-react.json`        | `react-library.json`        | renamed                                |
| `service-node.json`         | `service.json`              | renamed                                |
| `app-nextjs.json`           | `nextjs.json`               | renamed                                |
| `shared-library.json`       | `shared-library.json`       | direct                                 |
| `shared-library-react.json` | `shared-react-library.json` | renamed                                |
| `library-isomorphic.json`   | _(none)_                    | upstream-only — candidate, not adopted |
| `service-worker.json`       | _(none)_                    | upstream-only — candidate, not adopted |
| `infra-pulumi.json`         | _(none)_                    | upstream-only — candidate, not adopted |
| `infra-alchemy.json`        | _(none)_                    | upstream-only — candidate, not adopted |

Any upstream file with no local counterpart is a **new-preset candidate** — surface it, but the
default stance for a curated fork is _don't adopt unless the human wants this project family covered_.

---

## Step 4 — Deep analysis (the important part)

For **every** changed/added/removed upstream config option, determine **what** changed and **why**.
Do not summarise diffs mechanically — explain the reasoning. Sources, in order of preference:

1. **Upstream commit messages.** `git -C "$TMP/upstream" log <pinned-sha>..HEAD -- src/<file>` then
   `git -C "$TMP/upstream" show <sha>` for the relevant commits. Authors often explain the _why_ here.
2. **Upstream docs / README.** Read `README.md` and anything under `docs/` in the clone — the author
   frequently documents rationale (e.g. why `verbatimModuleSyntax`, why `module: preserve`).
3. **TypeScript release notes / handbook.** If a `compilerOptions` flag is unfamiliar, ambiguous, or
   new (e.g. introduced in a TS release), look it up via WebFetch/WebSearch on the official TS docs
   (`https://www.typescriptlang.org/tsconfig`, TS release notes). Confirm what the option does, its
   default, and which TS version it requires — this repo's guide claims "TypeScript 6.0+".

For each change, classify it for **this repo**:

- **adopt** — aligns with this repo's philosophy; apply as-is (translated to local naming/layout).
- **adapt** — good idea, but must be reshaped to fit local conventions (e.g. `${configDir}` usage,
  explicit-options philosophy, `src/`→`dist/` layout, the curated preset subset).
- **skip (with reason)** — upstream did it, but it conflicts with a deliberate local choice
  (e.g. path aliases, a preset family this fork doesn't cover, a stylistic split into more presets).
- **needs human decision** — genuinely a judgement call (new preset family, a philosophy shift like
  changing `target`/`module`/`moduleResolution`). Do not pre-decide these.

Cross-check every proposed adopt/adapt against the repo's own rules:

- The **"Known local divergences"** section above — if an upstream change touches one of those areas
  (especially anything re-introducing `paths`, or weakening the explicit-options set in `base.json`),
  it collides with a deliberate choice → mark it NEEDS DECISION, never auto-adopt.
- The "Philosophy" and "Path Aliases" sections of `docs/reference/tsconfig.md`.
- `CLAUDE.md` / `AGENTS.md` (e.g. the goja runtime constraint does **not** apply to consumer presets,
  but the "one config per tool / explicit over implicit" ethos does).
- The existing preset shapes in `tsconfig/*.json` (they use `${configDir}`, alphabetised keys, a
  `display` field, explicit option lists — keep that style).

If a change touches **how a project type is chosen** (not just option values) — e.g. a new preset, a
renamed concept, a changed recommendation — then `skills-chunks/setup-tsconfig/instructions.md` and
the guide's "Quick Selection" table may also need updating. Note this in the plan.

---

## Step 5 — Propose (do not write yet)

Present a single scannable report. Structure it exactly like this:

```
## tsconfig upstream sync plan

Upstream: <repo-url>
Baseline (pinned): <short-sha> — <subject> (<date>)
Upstream HEAD:      <short-sha> — <subject> (<date>)
Commits to reconcile: <N>

### Changes by upstream commit
<one line per relevant commit: `<short-sha> <subject>` — and a half-line of why it matters>

### Per-change decisions

| Upstream change | Local target | Decision | Rationale |
| --------------- | ------------ | -------- | --------- |
| <option/file + what changed> | tsconfig/<preset>.json or "guide" or "(new)" | adopt / adapt / skip / NEEDS DECISION | <why, citing commit msg or TS docs> |
...

### Proposed edits
- `tsconfig/<preset>.json`: <concrete change>
- `docs/reference/tsconfig.md`: <table/section/Common-Mistakes updates> + bump "Based on" pin to <new-sha>
- `skills-chunks/setup-tsconfig/instructions.md`: <only if decision rules changed; else "no change">

### Deliberately NOT adopting (recorded so they don't resurface)
- <upstream change> — <reason it doesn't fit this fork>

### Open questions for you
- <each "NEEDS DECISION" item, phrased as a yes/no or pick-one>

Proceed? Reply: yes / no / discuss <item>
```

Rules for this step:

- Show **diffs or exact new JSON** for every preset you intend to touch, inside the report or on request.
- List **everything you are skipping** and why — silent omission reads as "covered everything" when it
  isn't. The pin bump means skipped items won't re-surface next run, so they must be recorded here (and
  later in the commit message).
- If there are **NEEDS DECISION** items, do not produce a final apply set — resolve them with the human
  first, then re-present. Use the `AskUserQuestion` tool for clean multi-choice decisions when helpful.
- `no` → abort, write nothing, clean up the temp clone.
- `discuss <item>` → expand analysis on that item (more commit history, fetch TS docs), then re-ask.

---

## Step 6 — Apply (only after explicit yes)

1. **Presets.** Edit `tsconfig/*.json` per the approved decisions. Preserve local style: `$schema`,
   `display`, alphabetised `compilerOptions`, `${configDir}` paths, explicit option lists, `extends: "./base.json"`
   for non-base presets. If adopting a brand-new preset, create `tsconfig/<name>.json` and add it to the
   guide's tables.
2. **Guide.** Edit `docs/reference/tsconfig.md`:
   - Update the "Quick Selection" table, "Configuration Descriptions", and "Common Mistakes" to match.
   - Update "Requirements" / "Migration" if the upstream change implies a new minimum TS version.
   - **Bump the "Based on" line** to the new pin: replace the old commit URL with
     `https://github.com/0x80/typescript-config/commit/<upstream-HEAD-sha>`.
3. **Shared skill** — only if preset _decision rules_ changed: edit `skills-chunks/setup-tsconfig/instructions.md`
   (the decision order in Step 3, the Common-Mistakes checks, the preset list it must not hardcode).
4. **Regenerate the derived files** (these run plain node scripts, so they do **not** need the
   `datamitsu.config.js` bootstrap):

   ```bash
   node scripts/gen-tsconfig-md.ts   # → src/datamitsu-config/tsconfig.md.ts   (only if the guide changed)
   node scripts/gen-skills.ts        # → src/datamitsu-config/skills.ts        (only if the chunk changed)
   ```

   Rebuilding the full bundle / re-initialising `.datamitsu/` (`pnpm dm exec task -- build:datamitsu-config`,
   or the `./node_modules/.bin/datamitsu --no-auto-config exec task -- build:datamitsu-config` fallback when
   `datamitsu.config.js` is missing) is **optional** here — note it as a follow-up rather than doing it,
   unless the user asks. It's also produced by the normal build/commit flow.

5. **Branch hygiene.** Do not commit. If the user later wants a commit, ensure it's on a feature branch,
   not `main`. The commit message should list the adopted changes and the deliberately-skipped ones (so
   the decision record outlives this session). Bumping the pin is the durable state — next run diffs from it.

---

## Step 7 — Report + verify

After writing, print:

```
Done. Reconciled <N> upstream commits; pin bumped <old-sha> → <new-sha>.

Presets changed: <list or "none">
Guide updated:   yes/no
Shared skill updated: yes/no
Skipped (recorded): <count> — see plan above

Verify:
- pnpm exec tsc --noEmit            (or this repo's check task) — confirm presets still type-check
- git diff docs/reference/tsconfig.md tsconfig/ skills-chunks/  — review before commit
```

If you can run the type check non-destructively, offer to. Report failures with their output verbatim;
do not claim success you didn't observe.

---

## What this skill does NOT do

- Does **not** blindly mirror upstream. This is a curated fork; every adopt/adapt is a deliberate choice.
- Does **not** apply anything before explicit confirmation. Propose → confirm → apply, always.
- Does **not** edit generated files (`src/datamitsu-config/tsconfig.md.ts`, `src/datamitsu-config/skills.ts`,
  anything under `.datamitsu/`). It edits their sources and regenerates.
- Does **not** bump the TypeScript version or touch `package.json` deps. If upstream raises the minimum TS
  version, it surfaces that in the plan; the human bumps it intentionally.
- Does **not** commit or push. It leaves a reviewable working tree.
- Does **not** advance the pin unless the corresponding reconciliation was applied/decided this run.

---

## Edge cases

- **Pinned SHA missing upstream** (force-push/rebase): abort and ask for a new baseline. Never guess a substitute.
- **Upstream relocated its configs** (e.g. `src/` → `configs/`): detect from the diff/`git ls-files`, don't assume `src/`.
- **Upstream split or merged presets** (e.g. one preset becomes two, or two collapse to one): treat as a
  NEEDS DECISION — a curated fork may or may not want the finer granularity.
- **Only doc/README/lockfile/CI changes upstream, no config changes**: report "no preset changes; only
  docs/tooling moved upstream" and ask whether to bump the pin anyway (usually yes, to avoid re-reviewing
  the same noise next run).
- **Huge drift (many commits, many new presets)**: don't dump everything at once. Group by theme in the
  plan and let the human approve in batches; bump the pin only to the last fully-reconciled commit.
- **Network unavailable / clone fails**: report the failure plainly; do not fabricate a diff from memory.

---

## Interaction style

- Terse, scannable reports. Tables over prose for per-change decisions.
- Always cite the _why_: an upstream commit subject/SHA, or a link to the TS docs — not "best practice".
- Never present a skip without a reason. Never present an adopt without confirming it fits this fork's philosophy.
- This skill is local to this repo only — it is not distributed to consumer projects and should never be
  added to `skills-chunks/` or registered in `src/datamitsu-config/skills.ts`.
