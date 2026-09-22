# Unified ignore list

## Overview

Every managed tool that has to skip paths carries its own list, in its own syntax, and nothing keeps
the lists in step:

| List                                              | Syntax                    | Read by                          |
| ------------------------------------------------- | ------------------------- | -------------------------------- |
| `ignoreGroups` (`src/datamitsu-config/ignore.ts`) | gitignore, with `!`       | `.gitignore`, `.dockerignore`    |
| `GLOB_EXCLUDE` (`src/globs/globs.ts`)             | minimatch, extglob `?(s)` | ESLint verbatim, oxlint expanded |
| `ignorePaths` (`src/apps/cspell/index.ts`)        | micromatch                | cspell                           |
| `yamlIgnore` (`managed-configs/shared.ts`)        | gitignore / doublestar    | yamllint, yamlfmt                |
| `trufflehogExcludePaths`                          | regex                     | trufflehog                       |
| `.ls-lint.yml` `ignore` (starter default)         | doublestar                | ls-lint (opt-in, not yet wired)  |

This plan moves them onto **one catalog of ignore entries with stable IDs**. Each consumer is an
**ordered profile**: a list of entry IDs in the syntax that consumer reads, with an explicit spelling
wherever the consumer spells a path differently. `kind` is metadata that states why a path is
skipped. It is not a selection mechanism.

The work has three deliverables, in this order:

1. **Preservation refactor (Tasks 1–5).** Every consumer receives exactly the data it receives
   today: same members, same order, same spellings. This part is pure structure.
2. **ls-lint (Tasks 6–7).** The first consumer built on the catalog from the start: a managed base
   file in `.datamitsu/` plus the project's own `.ls-lint.yml`. It is enabled in this repository.
3. **Normalization (Task 8).** Deliberate behavior changes: one spelling per entry across glob
   profiles, and aligned membership where lists diverged by accident. Each change lands in its own
   commit with a reviewed diff and matching tests.

### Decisions (do not reopen during implementation)

- **Profiles, not kind selectors.** Current consumers differ in membership, order and spelling. For
  example, git writes `**/node_modules/`, ESLint `**/node_modules` and cspell `**/node_modules/**`;
  ESLint orders `node_modules → dist → coverage` and cspell `coverage → node_modules → dist`. Only an
  explicit ordered profile reproduces each one. Selecting by kind would also leak lock files and
  `CHANGELOG` into `.gitignore`, and `.env` and secrets into ESLint.
- **No inferred negation.** Negations (`!.claude/skills/`, `!**/.vscode/settings.json`, Pulumi
  `*.enc.*`) exist only in the gitignore profile, as they do today. Every other profile states
  explicitly what it contains. Being included in git does not make a file suitable for linting: ESLint
  deliberately excludes the encrypted Pulumi files that git re-includes.
- **No package-default `ignoreRules`.** A consumer can already extend datamitsu's own filtering, for
  every datamitsu-run tool, through `ignoreRules` in its config layer or through `.datamitsuignore`.
  Emitting defaults from here would duplicate native exclusions and break the tools' own overrides:
  a file dropped by the planner never reaches cspell or oxlint, so a consumer's `defineConfig` override
  could not re-include it. This mechanism is documented instead (Task 10).
- **No build-time baking.** Profiles are plain arrays resolved at module evaluation. The cost is
  negligible, and rendered data is pinned by tests instead of generated files.
- **Oracle = the data each consumer receives**, not the rendered file. `_gitignore.ts` and
  `_dockerignore.ts` pass `ignoreGroups` to the goja-only `tools.Ignore.stringify`, whose Go
  implementation sorts unspecified groups and deduplicates. Keeping that input deep-equal keeps the
  output identical without faking the engine in vitest.

### Corrected facts about datamitsu (verified in its source)

- Each config source gets its own goja VM. Managed `content()` is evaluated right after its own layer
  (`cmd/config_loader.go:397`), on **reconcile and chain-hash** only. `init` does not evaluate
  content, so a managed file such as `.ls-lint.yml` is created by reconcile.
- `ignoreRules` are concatenated by Go (`config_loader.go:800`). JS receives the input with inherited
  rules stripped. Rules are doublestar (datamitsu's glob matcher), not gitignore syntax, and support
  `!` and `*`.
- The file walk honors `.gitignore` (ignored paths, not untracked ones).
- **Repository-scoped tools with non-empty `globs` get a filtered file list** (`planner.go:421`). It
  only decides whether the run happens: ls-lint (`globs: ["**/*"]`) is skipped when every trigger file
  is ignored. With empty `globs` (knip) there is no such gate, and the run is subject only to the
  root-disable check. Either way, tools without `{files}` in their args (ls-lint, trufflehog, knip)
  walk the tree themselves. For that walk only the tool's own ignore config counts, which is why
  ls-lint needs a rendered list.

## Context (from discovery)

- **Lists:** `src/datamitsu-config/ignore.ts`, `src/globs/globs.ts`, `src/apps/cspell/index.ts:367`,
  `src/datamitsu-config/managed-configs/shared.ts`, `managed-configs/_trufflehog_exclude_paths_txt.ts`.
- **Consumers:**
  - `_gitignore.ts` and `_dockerignore.ts` (via `ignoreGroups` and `filterIgnore`);
  - `src/apps/eslint/index.ts:180` (`globalIgnores(GLOB_EXCLUDE, "s0/ignores")`);
  - `src/apps/oxlint/index.ts:145` (`toOxlintIgnorePatterns`);
  - `_yamllint_yaml.ts` and `_yamlfmt_yaml.ts` (via `yamlIgnore`);
  - trufflehog `--exclude-paths {root}/.trufflehog-exclude-paths.txt`.
- **ls-lint (verified against pinned v2.3.1):**
  - It does not read `.gitignore`. It uses doublestar v4. `!` is a silent no-op.
  - Multiple `-config` files merge: top-level `ls` keys replace each other (not recursively), and
    `ignore` is appended, sorted and deduplicated.
  - A missing config path is fatal. A user file with `ls: {}` is fine once merged with a base.
  - It checks only configured rules. Passing files as arguments skips parent `.dir` checks, so it
    must walk the whole tree.
  - Its `.dir: kebab-case` fails on every dot-directory (8 errors on this repository today).
- **Precedent:** the `gitleaks-managed` bundle in `src/datamitsu-config/datamitsu.config.ts:40` writes
  `.datamitsu/gitleaks-managed.toml`. `{root}` is valid inside a tool argument
  (`internal/tooling/executor.go:1375`).
- **Runtime boundary:** `src/datamitsu-config/` runs in goja, with no `node:*`. `src/apps/*` bundles run
  in Node/Bun. The shared module (`src/ignore/`) must be plain data and plain functions usable from
  both, like `src/globs/globs.ts` today.
- **Build gate:** `scripts/generate-rule-inventory.ts:191` (`LINT_CONFIG_SOURCES`) lists the directories
  the lint config is built from. `src/ignore` must be added once ESLint and oxlint import it, or the
  stale-build gate will miss changes.

## Development Approach

- **Testing approach: TDD.**
- **Tasks 1–5 contract:** each consumer's received data is **deep-equal, order included**, to the Task 1
  pin. A changed pin in these tasks is a bug, not an update.
- **Tasks 6–8** change behavior. Each change gets its own commit, a reviewed diff of the pinned data,
  and a one-line reason recorded in this plan.
- Complete each task, with tests passing, before the next. Update this plan when scope changes. Run
  `task refresh` after tasks that touch the build. `task rules:inventory` is not expected to change.

## Testing Strategy

- **Pins:** `expect(x).toEqual(<literal>)` against inline literals, not opaque `.snap` files, so the
  review diff shows the lists themselves.
- **Unit tests** for the catalog and profile resolution. They must fail on:
  - an unknown ID in a profile;
  - a duplicate ID in the catalog;
  - a negated entry referenced from a non-gitignore profile;
  - a glob profile entry that has no spelling for that syntax.
- **Matching tests (Task 8 only):** assert what each profile actually matches, using the consumer's
  own matcher where it resolves from an installed tool package. Cover nested and root paths,
  dotfiles, trailing slashes, `auto-import.d.ts` and `auto-imports.d.ts`, and both Pulumi encrypted
  conventions. Adding a matcher devDependency needs a decision first.
- **Binary checks for ls-lint:** run the pinned binary against the repository and against scratch
  trees.

## Implementation Steps

### Task 1: Pin what every consumer receives today

- [x] export what is not yet reachable from tests, without changing values: cspell's base
      `ignorePaths` and `trufflehogExcludePaths`
- [x] add `src/ignore/__tests__/pins.test.ts` with inline-literal pins for:
  - `ignoreGroups`: the whole `IgnoreMap` via `toEqual`, plus `Object.keys(ignoreGroups)` pinned
    separately, because `toEqual` does not check key order
  - `filterIgnore` behavior, tested directly (a `.claude/` line is stripped, other lines kept),
    rather than exporting its private set
  - `GLOB_EXCLUDE`
  - `toOxlintIgnorePatterns(GLOB_EXCLUDE)`
  - cspell `ignorePaths`
  - `yamlIgnore`
  - `trufflehogExcludePaths`
- [x] run targeted Vitest and typecheck (full suite excluded by implementation scope)

### Task 2: Catalog and profile model in `src/ignore/`

- [x] write tests first (`src/ignore/__tests__/catalog.test.ts`) for the failure cases listed under
      Testing Strategy, and for resolution order
- [x] `src/ignore/catalog.ts`: entries shaped as
      `{ id, kind, note?, git?: string, glob?: string, regex?: string, negate?: true }`
  - `id` is a stable camelCase key
  - `kind` is metadata only (`dependency | build | cache | lockfile | generated | vendored | encrypted
| secret | release | metadata | fixture | editor | log`), allowed to grow and never used to
    select
  - one entry may carry spellings for several syntaxes
- [x] `src/ignore/profile.ts`: `resolve(profile)`
  - a profile is `{ syntax: "gitignore" | "glob" | "regex", refs: Array<id | { id, as: string }> }`
  - `as` is that profile's own spelling; the gitignore profile is grouped
    (`Record<group, ref[]>`) because `ignoreGroups` is
  - `resolve` throws on every failure case listed under Testing Strategy
- [x] no `node:*`; confirm the goja bundle builds (`task build`) and the built `datamitsu.config.base.js`
      loads (`pnpm dm config show` succeeds)
- [x] run targeted Vitest and typecheck (full suite excluded by implementation scope)

### Task 3: gitignore and dockerignore profile

- [x] add catalog entries for every `ignoreGroups` pattern; negations become `negate: true` entries
- [x] `src/ignore/profiles/gitignore.ts` lists them grouped, in today's order
- [x] rebuild `ignoreGroups` as `resolve(gitignoreProfile)`, keeping its export name and type, so
      `_gitignore.ts` and `_dockerignore.ts` are untouched
- [x] the Task 1 pin is unchanged
- [x] run targeted Vitest and typecheck (full suite excluded by implementation scope)

### Task 4: ESLint and oxlint profile

- [x] add catalog entries for `GLOB_EXCLUDE`, reusing an existing ID when the path is the same thing
      (e.g. `nodeModules`) and giving the ESLint spelling via `as` where it differs from the entry's
      `glob`
- [x] `auto-import?(s).d.ts` stays a single entry whose `glob` is the extglob. `toOxlintIgnorePatterns`
      keeps expanding it, and is narrowed to what is used: `?(…)` and `@(…)` expand, while `*(…)`,
      `+(…)` and `!(…)` throw, because they cannot be expanded to a finite list
- [x] `GLOB_EXCLUDE = resolve(eslintProfile)`; oxlint unchanged
- [x] add `src/ignore` to `LINT_CONFIG_SOURCES` in `scripts/generate-rule-inventory.ts`
- [x] Task 1 pins for ESLint and oxlint unchanged
- [x] run targeted Vitest and typecheck
- [x] run `task refresh`; it must pass

### Task 5: cspell, yamllint/yamlfmt and trufflehog profiles

- [x] cspell profile reproduces `ignorePaths` in today's order, including its tool-specific entries
      (`**/__tests__/**`, `cspell.config.js`, `go.mod`, …). They become catalog entries with a `note`, so
      the order stays interleaved
- [x] `yamlIgnore = resolve(yamlProfile)`
- [x] trufflehog profile (`syntax: "regex"`) reproduces the six strings exactly. The lockfile
      alternation stays **one entry**, `lock files`, with its regex spelling as is; it is not split
- [x] all Task 1 pins unchanged
- [x] run targeted Vitest and typecheck (full suite excluded by implementation scope)

### Task 6: ls-lint on the catalog (managed base plus user file)

- [x] write tests first:
  - `lsLintProfile` resolves to the expected doublestar list: dependency, build, cache and lockfile
    entries; `.git`; and tracked tool directories whose names we do not choose (`.github`, `.husky`,
    `.changeset`)
  - the managed base YAML contains that `ignore` plus
    `.dir: kebab-case | snake_case | regex:\.[a-z0-9-]+ | regex:__[a-z0-9]+__`
  - `_ls_lint_yml.ts` migration (below): idempotent, and preserves custom rules and exclusions
- [x] bundle `ls-lint-managed` in **`src/datamitsu-config/datamitsu.config.ts`** (the published
      config) → `.datamitsu/ls-lint-managed.yml`
- [x] `tools.ts` ls-lint args, as four strings: `-config`, `{root}/.datamitsu/ls-lint-managed.yml`,
      `-config`, `{root}/.ls-lint.yml`. It stays `skip: true` (opt-in) for consumers
- [x] `_ls_lint_yml.ts`:
  - always emits a file, at least `ls: {}`, because a missing user file is fatal
  - no longer writes a default `.dir` or `ignore`
  - **Migration:**
    - drops `ls[".dir"]` when it is exactly the string `kebab-case | snake_case` (the old default)
    - drops `ignore` when it is exactly the ordered array `[".git", "node_modules", "dist"]`
    - preserves everything else
    - Deliberate relaxation: someone who wrote the old default on purpose gets the base rule, which
      is a superset (it adds dot-directories and `__x__`). Record this in the file comment
  - header comment:
    - the file layers over `.datamitsu/ls-lint-managed.yml`
    - redefining `.dir` replaces the base rule, so restate the dot-directory regex
    - `ignore` adds to the base
  - replace the incorrect claim that ls-lint needs at least one rule, after checking the binary with
    a standalone `ls: {}`
- [x] **binary checks against scratch trees:**
  - `.github` and `node_modules` pass
  - a bad directory name fails
  - a bad file name fails under a fixture user config that has an extension rule (the base has only
    `.dir`, so there is no file-name policy to violate without one)
  - a missing user file fails loudly
- [x] document in `_ls_lint_yml.ts` and the docs that enabling ls-lint in a consumer needs a reconcile,
      so that `.ls-lint.yml` exists
- [x] run targeted Vitest and typecheck (full suite excluded by implementation scope)

### Task 7: Enable ls-lint in this repository

- [x] in the root `datamitsu.config.ts`, override `tools["ls-lint"]` with `skip: false`
- [x] this repository's `.ls-lint.yml` (camelCase allowed for `.ts`, no renames):
  - `.md: kebab-case | SCREAMING_SNAKE_CASE`
  - `.ts` and `.*.ts: kebab-case | camelCase`
  - `.json: kebab-case | camelCase | snake_case`
  - `.yaml: kebab-case | regex:Taskfile`
  - a `src/datamitsu-config/{managed-configs,inline-config}` block that restates `.dir` and allows
    `.ts`/`.*.ts: camelCase | regex:_?[a-z0-9_]+`
  - `ignore: [dist-inline-eslint-config]`
- [x] `datamitsu lint --tools ls-lint` passes
- [x] run `task refresh`; it must pass

### Task 8: Normalization (behavior changes, one commit each)

For each item: add matching tests first, change the profile, update the Task 1 pin, and record the
reason and the diff summary here.

- [x] **8a. Directory spelling (conditional).** In the ESLint, oxlint, cspell and ls-lint profiles,
      converge a directory entry onto one `glob` spelling **only where** tests show each consumer
      behaves identically with it. The tests must run the consumer's actual traversal and pruning, not
      standalone pattern matches. Where behavior differs, keep the `as` exception and state why in
      its `note`
- [x] **8b. Shared build and cache set, scoped to ESLint, oxlint, cspell and ls-lint.** Decide which
      dependency, build and cache directories these four skip. Today cspell lacks most of what ESLint
      skips, and ESLint lacks `vendor/`. No other consumer is in scope
- [x] **8c. Lock files, scoped to ESLint, oxlint, cspell and yamllint/yamlfmt.** Decide one lockfile set
      for these. trufflehog's lockfile exclusion is a separate security policy (lock files hold
      integrity hashes, not secrets). It is out of scope here and is kept unchanged
- [x] **8d. Leftover overrides.** Remove any `as` override that no longer changes a profile's output

### Task 9: Verify acceptance criteria

- [x] every list in the Overview table resolves from `src/ignore/`
- [x] the Task 1 pins changed only in Task 8 commits, each with a recorded reason
- [x] `pnpm test`, `task refresh` and `datamitsu check` pass (`datamitsu lint` on the whole repository instead of `check`, so no fixer rewrote unrelated files)
- [x] `grep -rn "node:" src/ignore` is empty

### Task 10: [Final] Documentation

- [x] CLAUDE.md gets a "Shared Ignore List" section, next to "Shared Formatter Settings", covering:
  - the catalog, profiles and `kind` as metadata
  - that negations live only in the gitignore profile
  - how to add a path: an entry, then the profiles that need it
  - the consumer extension point: `ignoreRules` / `.datamitsuignore` for datamitsu-run tools, and
    the tools' own configs for their self-walks
- [x] regenerate docs (`task refresh`); do not hand-edit `docs/reference/*`

## Technical Details

```ts
type IgnoreEntry = {
  id: string;
  kind: IgnoreKind; // metadata
  note?: string;
  git?: string; // gitignore spelling (anchoring and trailing-slash semantics are gitignore's)
  glob?: string; // doublestar/minimatch spelling, root-relative
  regex?: string;
  negate?: true; // gitignore only; resolve() rejects it elsewhere
};

type Ref = string | { id: string; as: string };

type Profile =
  | { syntax: "gitignore"; groups: Record<string, Ref[]> }
  | { syntax: "glob" | "regex"; refs: Ref[] };
```

Spellings are not derived from each other. Gitignore and glob anchoring differ: a bare `.env` or
`.datamitsu/` in gitignore is not root-anchored the way a glob is. An entry therefore states each
spelling it is used with, and Task 8 reduces the number of distinct spellings on purpose, with tests.

## Post-Completion

**Self-walking tools and consumer rules.** Tools that walk the tree themselves never see a consumer's
`ignoreRules` or `.datamitsuignore`. A datamitsu change could hand them an effective ignore file.
Before proposing one, define its scope: config `ignoreRules` alone would miss nested
`.datamitsuignore` files and their depth-based precedence. This is a design question for datamitsu.

**Consuming projects.**

- Tasks 1–5 change nothing they receive.
- Task 8 commits change what ESLint, oxlint, cspell, ls-lint and yamllint/yamlfmt skip; each is
  recorded above. trufflehog is unchanged.
- An existing `.ls-lint.yml` has its legacy defaults migrated on the next reconcile. ls-lint stays
  opt-in.

## Implementation log (Tasks 1–7)

- Scope: Tasks 1–7 only; no commits or branch changes. Tasks 8–10 remain deferred.
- Task 1: 92 targeted tests passed, including all eight literal pins. Cspell's array is
  exported from `src/apps/cspell/ignore.ts` and consumed by its base config: importing the whole
  config requires a Russian dictionary available only in the bundled tool environment.
- ⚠️ Validation deviation: use targeted Vitest instead of the full proxy-dependent suite, as
  requested. The initial `pnpm vitest` invocation stalled before output; the installed
  `node_modules/.bin/vitest` runs the same pinned test runner successfully.

- Task 2: resolver tests written first and observed failing before implementation; 102 targeted
  tests and the TypeScript check passed. The shared implementation uses no Node APIs.
- ⚠️ `pnpm` ultimately reported registry fetch failure while verifying its pinned version.
  Build/load verification is pending; attempting the installed datamitsu entrypoint as well.
- ⚠️ `pnpm dm check` ran but failed only on spelling in the supplied plan (British spellings and
  unknown compounds). No ignore policy was changed to suppress those findings; the operator fixed
  the wording.

- Task 3: grouped gitignore profile and catalog now supply the existing `ignoreGroups` export.
  Both file renderers remain untouched. All 103 targeted tests and typecheck passed; pins unchanged.
- ⚠️ Task 2 build is blocked by pnpm registry verification (network fetch failure); the direct
  task invocation reached `oxlint:codegen` and encountered the same version-switch dependency.

- Task 4: ESLint profile, shared IDs and inventory source tracking implemented. Extglob rejection
  tests failed for `*` and `+` before the fix. All 108 targeted tests and typecheck passed, with
  unchanged pins. ⚠️ `task refresh` reaches the same pnpm registry blocker as Task 2.

- Task 5: cspell, YAML and trufflehog profiles implemented after a failing profile test.
  All 109 targeted tests and typecheck passed. All eight Task 1 pins remain unchanged.

- Task 6: 118 targeted tests and typecheck passed. Published bundle rendered and loaded in the
  real goja engine using installed `tsdown` and `datamitsu` directly; its bundle link, YAML and
  four tool arguments were checked from `config show`. Full `task build` remains blocked above.
- Task 6 binary checks (pinned ls-lint, disposable `/tmp` trees): standalone `ls: {}` exits 0;
  `.github`, root/nested `node_modules`, dot-directories and `__tests__` pass; a bad directory,
  a bad TypeScript filename with an extension rule, and a missing user file each exit 1.
- Task 6 behavior: ls-lint now layers the managed directory policy and explicit exclusions under
  the user file. Exact legacy defaults migrate to the broader base; custom values survive.
  Its profile includes dependency/build/cache directories, existing glob lockfile entries and
  tool metadata directories. Other consumers retain every Task 1 value; no Task 8 alignment.

- Task 7: tests first confirmed the opt-in and repository config were absent. The root config
  now enables inherited ls-lint operations and `.ls-lint.yml` has exactly the planned rules.
  All 120 targeted tests and typecheck passed before final formatting.
- ➕ Task 7 rule conflict: the exact scoped rule rejects existing generated
  `src/datamitsu-config/inline-config/lefthook-proxy.ts` and `lefthook-sort.ts`. No renames are
  allowed. Asked whether to add `kebab-case` to that scope; kept the planned rule pending an answer.
- ⚠️ Task 7 managed execution: init cannot install `ls-lint-managed` because the sandbox denies
  writes to the global bundle cache. `datamitsu lint --tools ls-lint` therefore fails on the
  missing `.datamitsu/ls-lint-managed.yml`. The direct pinned-binary run using the generated
  base in `/tmp` reaches only the two filename findings above.
- Task 10 documentation remains deferred, including the CLAUDE/AGENTS architecture section;
  only the consumer prerequisite explicitly required by Task 6 was added to the usage guide.

- Final Task 1–7 validation: 120 targeted tests pass after formatting; all eight Task 1 pins
  remain unchanged. The TypeScript check passes via the installed compiler. The object-order
  fixture uses ordered entries so the repository's object-key sorter cannot alter its input.
- ⚠️ The final managed check was attempted through installed datamitsu because pnpm's version
  verification is unavailable. Fixers passed; lint stopped when tsc could not write its global
  cache in the sandbox. The direct `tsc --noEmit` check succeeds.
- The proposed Task 7 scoped `kebab-case` addition passes the pinned binary over the repository
  when supplied from a temporary user config. It has not been applied; approval is still pending.

- ⚠️ Task 7 `task refresh` was retried after implementation and failed at `oxlint:codegen`
  because pnpm could not verify its pinned version without registry access. The operator must
  rerun build/refresh and init outside this sandbox, then the managed ls-lint check after the
  scoped-rule decision. No reconcile, commits, branch changes or Tasks 8–10 were performed.
- The final generated goja config, layered with the root config, loads successfully and reports
  ls-lint enabled with the four planned arguments. Generated reference docs and parser pins
  have no diff.

## Operator follow-up (Tasks 1–7, outside the sandbox)

- Resolved the ➕ Task 7 rule conflict: `kebab-case` added to the scoped `.ts`/`.*.ts` rules in
  `.ls-lint.yml` (and the adoption test), so `inline-config/lefthook-*.ts` pass without renames.
- Resolved the ⚠️ sandbox blockers: `task refresh` passes (build, docs, blocklist, parsers, pins,
  rule-inventory up to date), and `datamitsu lint --tools ls-lint` passes on this repository.
- ➕ ls-lint performance: ls-lint expands every ignore pattern with its own full walk of the tree,
  so the ~50 `**/` patterns of the profile cost 17.7s through datamitsu (11.5s direct). The managed
  base now folds them into one `**/{…}` brace group (`mergeDoublestarPatterns` in
  `src/datamitsu-config/ls-lint-defaults.ts`, which throws on alternatives holding `,` `{` `}`):
  565ms through datamitsu, and an identical set of linted paths (833 = 833, `-debug` diff empty).
  A bad directory name is still reported.
- Restored the explanatory doc comments codex had cut from `src/globs/globs.ts` (why `GLOB_EXCLUDE`
  is shared; which extglobs expand and why the rest throw), and the Pulumi reason
  (`s0/pulumi-sops` appends `.enc`; SOPS needs the real extension last) as the entries' `note`.
- Targeted suite: 148 tests pass; `tsc --noEmit` clean.
- ➕ Catalog as a table: `src/ignore/catalog.ts` is now an object keyed by ID, sorted (perfectionist),
  under `// prettier-ignore` (both prettier and oxfmt honor it), with a file-level inline
  `@stylistic/key-spacing` `align: "value"` that keeps the ID column aligned. Every `IgnoreEntry`
  field is required (`undefined` when absent) so all six columns line up; only the ID column is
  maintained by a rule, the inner columns are re-aligned by hand when a wider value lands. Types
  moved to `src/ignore/types.ts` because the inline rule config applies to the whole file. Profile
  refs are typed `IgnoreId`, so a mistyped ID is a `tsc` error; the all-lowercase lock-file regex ID
  was renamed `lockFiles` for cspell. Resolver looks entries up through a `Map` of own keys.
- ➕ Task 8 decisions (left uncommitted per the user's instruction: one reviewed pin diff instead of
  one commit per item):
  - **8a.** A probe ran real ESLint (flat-config API) and real cspell (CLI) over a fixture tree with
    root and nested `coverage`, `node_modules`, `dist`, `out`, `.turbo`, `.git`, `vendor`,
    `storybook-static`, `generated` and `playwright-report-*`. `**/x` and `**/x/**` visited identical
    file sets in both tools; a no-ignore control visited 24/28 (ESLint) and 27/28 (cspell) files, so
    the probe was live. ls-lint only skips a directory's own name with `**/x`, so every glob entry
    converged there. `go.sum` and `pnpm-lock.yaml` became `**/…`, covering nested modules.
  - **8b.** Only unambiguous dependency, build and cache directories were shared. ESLint gained
    `vendor`, `.pnpm-store` and `.pnp.*`; cspell gained `.pnpm-store`, `.pnp.*`, `.yarn`, `.next`,
    `.nuxt`, `.svelte-kit`, `.output`, `.vercel`, `.turbo`, `.cache` and `.datamitsu`. Generic names
    that can be real source directories (`build`, `out`, `output`, `tmp`, `temp`) were not
    propagated. `.pnpm-store` also joined the gitignore profile (Dependencies) and this repository's
    `.gitignore`.
  - **8c.** One lock-file set (trufflehog's names, as globs) for ESLint/oxlint, cspell and ls-lint. (Later superseded for ls-lint, which now checks directories only; see the naming-split note below.)
    cspell reads every file, so these were being spell-checked. yamllint/yamlfmt get only
    `**/pnpm-lock.yaml`, the one YAML lock file in the set. trufflehog is unchanged.
  - **8d.** Every per-profile `as` override became redundant and was removed.
  - Verification: `pnpm test` (429 tests), `task refresh`, whole-repository `datamitsu lint`
    (17 tools) and `datamitsu lint --tools ls-lint` all pass.
- ➕ AGENTS.md (CLAUDE.md) "Shared Ignore List" section written (Task 10).
- ⚠️→fixed (codex final review): 8a's `**/playwright-report-*` also matched source files such as
  `src/playwright-report-parser.ts`, which the directory-only probe could not see. The catalog keeps
  `**/playwright-report-*/**` (with a `note`); only ls-lint uses the bare wildcard, via `as`.
  `src/ignore/__tests__/eslint-traversal.test.ts` now runs ESLint's real traversal over root and
  nested ignored directories plus look-alike source files, and failed before the fix. Two comments
  that restated code were trimmed.
- ➕ Naming split (supersedes the ls-lint parts of Tasks 6–7 and 8c above): alint now owns file
  names (`src/datamitsu-config/alint-defaults.ts` → `.datamitsu/alint-managed.yml`, extended from
  `.alint.yml`), and ls-lint owns directory names only. The ls-lint profile holds no lock files, the
  base no longer folds patterns into one `**/{…}` group but expands them to fixed depths
  (`expandToDepth`, `LS_LINT_IGNORE_DEPTH`), and this repository's `.ls-lint.yml` is `ls: {}`.
  Reason: ls-lint expands every glob `ignore` entry over the whole tree before walking (upstream
  issue #246); one `**/node_modules` took minutes on a large pnpm monorepo. Reviewed by codex and a
  separate Claude agent; their findings (router names, Python caches, generated Go/JS names,
  GitHub-named YAML, intercepting routes) are covered by tests and checked on the real binaries.
- ➕ The two hand-written planner excludes (`jsonExcludeGlobs`, `yamlExcludeGlobs`) now resolve from
  the catalog as well, which is what makes the AGENTS.md claim true. They gained the encrypted
  documents they were missing: `*.sops.yaml`, `*.sops.yml`, `*.enc.yaml`, `*.enc.yml`, `*.enc.json`
  and `*.json.enc`. The key sorters ran over them before; SOPS computes its MAC over the values in
  the order they appear, so re-ordering a document is not a formatting change.
