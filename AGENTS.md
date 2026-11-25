# AGENTS.md

Configuration-source and generator changes in this repository require the build, preview,
reconciliation and verification workflow below before completion. This is standing authorization
to run `pnpm dm config reconcile` here, despite the imported guides' default. It does not authorize
Git operations or override explicit user restrictions.

**Read [.datamitsu/ai/agents/agents-docs-website.md](.datamitsu/ai/agents/agents-docs-website.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**

Before changing the datamitsu configuration — `src/datamitsu-config/` or the root `datamitsu.config.ts` — read [.datamitsu/ai/agents/datamitsu-config-author.md](.datamitsu/ai/agents/datamitsu-config-author.md).

## Runtime Environment

`tsdown` compiles `datamitsu.config.js` from `src/datamitsu-config/` into one file for **goja**, a Go-based runtime limited to the ES5/ES6 JavaScript it supports. Never use Node APIs or import `node:*` modules there, including `node:fs` and `node:crypto`. Confine Node APIs to `scripts/`: build-time `scripts/*.ts` run in Node.js and generate source for the bundle.

Terraform, OpenTofu and Terragrunt declare `caches: ["providers"]` and use
`{toolCache:providers}`. Named caches and the implicit `default` are siblings
beneath the same checkout/app-identity parent. `default` is reserved and
unknown names fail configuration loading. The removed `cacheDirs` API has no
compatibility path or data migration. Cache clearing is unchanged.
Terragrunt depends on managed `terraform` and `tofu` native binaries so engine
names do not fall through to system versions; do not force one engine globally.
Preserve checksum verification. Standalone Terraform plugin caching is not
concurrency-safe; keep it distinct from Terragrunt's coordinated cache server.
Stop tools before `cache clear`; refresh removed farms and reinitialize stale
provider symlinks. Config publication remains blocked on a supporting core release.

## Skill Adapters

`skills-chunks/<name>/adapters/codex.md` is a skill, not a slash-command prompt:
keep YAML frontmatter with `name` and `description`. Reconciliation writes it to
`.agents/skills/<name>/SKILL.md` and removes only its old `.codex/prompts/<name>.md`.
Claude adapters stay in `.claude/skills/<name>/SKILL.md`; shared instructions stay
in `.datamitsu/ai/skills/`. Regenerate `src/datamitsu-config/skills.ts` with
`task build:skills`, never by editing it. The reconciliation integration test
checks metadata, legacy-prompt migration, custom-prompt preservation and idempotence.

In both adapter templates, use `{{skillInstructionsPath}}` for the skill's instructions.
The generator resolves it from the installed skills directory and the skill name.

## Documentation Generation

Documentation is built with Zensical from `website/`, with its theme overrides in `overrides/`.
`docs/` holds only unpublished backlog and plan files, outside the site's `docs_dir`.
Zensical 0.0.70 supports `exclude_docs`, `draft_docs` and `not_in_nav`; the directory separation
remains deliberate so internal work cannot be published by a missing exclusion.

Do not edit generated pages manually; regeneration overwrites them. These generators read `pnpm dm config show`:

- `website/reference/apps.md` — `scripts/generate-docs-apps.ts`
- `website/reference/tools.md` — `scripts/generate-docs-tools.ts`
- `website/reference/project-types.md` — `scripts/generate-docs-project-types.ts`
- `website/reference/managed-configs.md` — `scripts/generate-docs-managed-configs.ts`

Other documentation and commands:

- `website/reference/tsconfig.md` — manually maintained, bundled as `.datamitsu/tsconfig.md`
- Other docs — manually maintained markdown files
- **Build site:** `pnpm dm exec task -- docs:build`
- **Serve locally:** `pnpm dm exec task -- docs:serve` (<http://localhost:8000>)
- **Regenerate content:** `pnpm dm exec task -- docs:generate`
- **Skill:** `/update-docs` — regenerates all auto-generated documentation

Lefthook pre-commit hook runs `docs:generate` automatically and stages changes (`stage_fixed: true`).

Task naming follows `docs:*` namespace in `Taskfile.yaml`.

Configuration: `zensical.toml` at project root.

## Registry Blocklist Validation

Blocklist validation prevents adding deprecated/replaced tools to registry files.

- **Blocklist data:** [src/datamitsu-config/registries/blocklist.json](src/datamitsu-config/registries/blocklist.json)
- **Validator:** [scripts/validate-registry-blocklist.ts](scripts/validate-registry-blocklist.ts)
- **Run manually:** `pnpm dm exec task -- validate:blocklist`
- **Pre-commit:** Runs automatically at priority 2 (after docs:generate, before datamitsu-check)

**Blocked tools:**

- Python (uv): black, flake8, isort, and 60+ others replaced by Ruff
- NPM (node): lodash, underscore, moment, request

**Adding to blocklist:**

1. Edit `blocklist.json` with tool name, reason, and replacement
2. Validator will enforce on next commit

See [blocklist.json](src/datamitsu-config/registries/blocklist.json) for complete list and rationales.

## One Config Per Tool

Each tool config uses a single **canonical filename** per project. The `otherFileNameList` field in `cmdInit.ts` lists all alternate filenames that `datamitsu init` deletes automatically. This prevents conflicts from multiple config files for the same tool.

Similarly, each file-type concern (linting, formatting) should be handled by **one dedicated tool**, not multiple overlapping ones.

When adding new tools, check that no existing tool already covers the same file types and operations.

### Configuration format priority

Unless explicitly instructed otherwise, choose the first configuration extension
the tool supports in this order:

`.mts` → `.ts` → `.mjs` → `.js` → `.toml` → `.yaml` → `.json` → `.ini`.

Verify support in the pinned tool version, including its runtime and config loader,
before choosing the canonical filename. Do not select a lower-priority format just
because an existing example uses it. A tool that requires a particular native
filename or format keeps that requirement.

### JS/TS config tools

A tool with a JS/TS config **must** export a `defineConfig(overrides?)` helper from its `src/apps/<tool>/index.ts`, and the generated config file **must** call it:

```js
import { defineConfig } from "<.datamitsu/<tool>.config.js>";

export default defineConfig();
```

This gives users type-checking and autocomplete when adding overrides, even in a plain `.js` file — the same experience as `eslint.config.mjs` and `prettier.config.mjs`. See [src/apps/prettier/index.ts](src/apps/prettier/index.ts) and [src/apps/eslint/index.ts](src/apps/eslint/index.ts) for reference implementations.

`defineConfig` accepts either an overrides object (shallow-merged over the base) or a function that receives the base config and returns the final one — the latter lets users extend array/object fields instead of replacing them:

```js
import { defineConfig } from "<.datamitsu/<tool>.config.js>";

export default defineConfig((base) => ({
  ...base,
  words: [...base.words, "datamitsu"],
}));
```

For new tools that support JS/TS, use this helper pattern with the highest-priority
supported extension above unless explicitly instructed otherwise.

## Shared Formatter Settings

`indentSettings` in [src/datamitsu-config/constants.ts](src/datamitsu-config/constants.ts) is the **single source of truth** for indent width and line width across every formatter (prettier, oxfmt, ruff, typstyle, …). It is one object — `{ indentWidth, lineWidth }` — not a per-language map.

When wiring a formatter, reference `indentSettings.indentWidth` / `indentSettings.lineWidth` instead of hardcoding `2` / `100`, so every formatter stays in lockstep:

- Tools defined in `src/datamitsu-config/` read it directly (e.g. typstyle in `tools.ts`).
- The bundled `defineConfig` sources in `src/apps/*/index.ts` (prettier, oxfmt) import it from `../../datamitsu-config/constants` and feed it into the tool's native config (`printWidth`, `tabWidth`, …). These bundle into the inline config archive, so the value is baked in at build time.

Do not add new keys to `indentSettings` for one-off tools — keep it a single shared setting.

Typstyle fix and lint both pass `--line-ending=lf`. Version 0.15.2 changed its default to
preserve input line endings; explicit LF keeps this configuration's previous normalization.

oxfmt operations must include `--no-error-on-unmatched-pattern`: a staged-file check can contain
only files that oxfmt ignores (for example `package-lock.json`). That is an empty check, not a
formatter failure.

YAML has one formatter, yamlfmt; `oxfmtGlobs` deliberately leaves it out. oxfmt and yamlfmt disagree
on flow-mapping spacing, so with both on a file `dm fix` leaves one form and the other's check fails.

**Alphabetical key order for YAML and `.properties` comes from `sort-keys`, not from `yq`.** The
sorting itself was deliberate and stays; what changed is the tool under it, because both `yq`
invocations lost data rather than restyling:

- YAML. `sort_keys(..)` orders keys without knowing that an alias may not precede its anchor, so a
  document declaring `z: &a` and referring to it from `b: *a` comes back with `b` first and stops
  parsing — `yamllint` then reports `found undeclared alias "a"` on a file `dm fix` had just written.
- `.properties`. The sorter round-tripped through YAML (`-p props -o props`), which folds `a.b` into
  a nested `a`, so a file holding both `a.b=hello` and `a=world` came out as `a = world` alone.

[src/apps/sort-keys](src/apps/sort-keys) is a Bun app in the shape of `lefthook-sort`, and it answers
both: a YAML document carrying an anchor, an alias or a merge key is **left exactly as it was** —
sorting it safely would mean ordering anchors before their aliases, which is a different operation
from "alphabetical" — and the `.properties` mode never parses values at all, ordering whole records
(a key line with its continuations and the comments above it) as text. Sequences keep their order in
both: a list is an order, and reordering `steps:` would change what the file means.

The format is its first argument (`sort-keys yaml …`, `sort-keys properties …`), so the two operations
in `tools.ts` are `sort-keys-yaml` and `sort-keys-properties` — the shape `yq-json` and `yq-yaml`
already had. Its exclusions are the ones the `yq` operation carried, for the same reasons: dclint owns key order
in Compose files, lefthook configs are ordered by the lifecycle they execute in, and
`yamlExcludeGlobs` holds the lock file and the SOPS documents whose MAC covers the values in the
order they appear. `yq-json` is untouched — JSON has no anchors.

## Shared Ignore List

[src/ignore/catalog.ts](src/ignore/catalog.ts) is the **single source of truth** for every path a managed tool skips. Each consumer is an **ordered profile** in [src/ignore/profiles/](src/ignore/profiles/) that lists catalog IDs in the syntax it reads: gitignore (`.gitignore`, `.dockerignore`), glob (ESLint and oxlint via `GLOB_EXCLUDE`, cspell, yamllint/yamlfmt, ls-lint) or regex (trufflehog). Do not write an ignore list into a tool config by hand.

To skip a path: add one catalog row, then reference its ID from each profile that needs it. Profiles are typed against the catalog, so a mistyped or removed ID is a `tsc` error. `task refresh` and the pins in `src/ignore/__tests__/pins.test.ts` show exactly what every consumer receives; a changed pin is a behavior change and needs a reason.

- **Profiles, not kinds.** `kind` records why a path is skipped and never selects anything. Consumers differ on purpose: git must not ignore lock files, and trufflehog keeps its own narrower lockfile and minified-file policy.
- **Negations are gitignore-only.** `.claude/*` with `!.claude/skills/` exists only in the gitignore profile. Other profiles list what they skip explicitly; being tracked by git does not make a file suitable for linting.
- **Globs use `**/x`, not `**/x/**`.** Both are equivalent in ESLint and cspell (measured, root and nested), and only `**/x` names the directory itself, which ls-lint needs to skip it (the ls-lint base then renders it as `x`, `*/x`, …, never as `**`). The exception is a wildcard name: `**/playwright-report-*` would also match a source file such as `playwright-report-parser.ts`, so it keeps `/**`. `src/ignore/__tests__/eslint-traversal.test.ts` runs ESLint's real traversal with look-alike source files; extend it when adding a directory entry.
- **The catalog is a table.** Every `IgnoreEntry` field is required (`undefined` when absent) so the columns line up, the object sits under `// prettier-ignore`, and a file-level inline `@stylistic/key-spacing` `align: "value"` keeps the ID column aligned. The inner columns are aligned by hand when a wider value lands. Keep `catalog.ts` free of anything but the table: an inline rule config applies to the whole file.
- **The planner excludes come from it too.** `jsonExcludeGlobs` and `yamlExcludeGlobs` in [src/datamitsu-config/globs.ts](src/datamitsu-config/globs.ts) resolve the `json-exclude` and `yaml-exclude` profiles. They keep the JSON key sorter (`yq-json`) and the YAML formatters off files whose byte order is load-bearing: a lock file, a manifest `sort-package-json` owns, and a SOPS document, whose MAC covers the values in the order they appear.
- **Naming is split between two tools.** alint owns file names: the managed rules in `src/datamitsu-config/alint-defaults.ts` render to `.datamitsu/alint-managed.yml`, which the project's `.alint.yml` extends with `allow_out_of_root: true`, because datamitsu links that file from its store and alint otherwise refuses a local `extends` outside the tree. alint honors `.gitignore`, so it needs no ignore list. ls-lint owns directory names only: its base `.datamitsu/ls-lint-managed.yml` is rendered from its profile with every `**/x` expanded to fixed depths (`x`, `*/x`, … up to `LS_LINT_IGNORE_DEPTH`) and never a `**` pattern. ls-lint expands each glob `ignore` entry over the whole tree before walking (upstream issue #246): one `**/node_modules` took over 7 minutes on a pnpm monorepo, depth 3 takes 1.5s. Never pass ls-lint a path argument either: it silently drops errors (upstream issue #365).

A consuming project skips paths in every datamitsu-run tool with `ignoreRules` in its config layer or a `.datamitsuignore` file; both are native datamitsu and need nothing from this package. Tools that walk the tree themselves (ls-lint, editor extensions, a direct `dm exec eslint .`) never see those rules and are extended through their own config.

## Shared Lint Rule Lists

[src/lint-rules/](src/lint-rules/) is the **single source of truth** for what ESLint and oxlint do with every rule. Both tools read the same three lists:

- [permanent-disabled.ts](src/lint-rules/permanent-disabled.ts): rules that do not fit this stack or whose checks another tool owns. They stay off.
- [temporary.ts](src/lint-rules/temporary.ts): rules disabled only until the code is ready. Shrink this list.
- [permanent-enabled.ts](src/lint-rules/permanent-enabled.ts): rules and options that must stay on, independent of changes to the `recommended` preset. Keep this list small, not a copy of `rule-inventory.json`. List a rule if losing it silently should fail the build, its defaults are wrong, or a preset is likely to change it.

Declare options once: for example, `eqeqeq` needs `{ null: "ignore" }` for the `no-eq-null` decision. Do not duplicate options in `src/apps/oxlint/index.ts` and `src/apps/eslint/plugins/javascript.ts`. Both tools receive the declared options. Unlike disabling a rule twice, reporting it twice duplicates findings. `validate:lists` checks the committed census: **at least one** tool must report the rule at error; the handoff chooses which.

Rules there are always written in the **ESLint** spelling (`@typescript-eslint/`, `import-x/`, `jsx-a11y-x/`, `@next/next/`). `rule-mapping.ts` translates the names for both runtime configs and generators; `index.ts` filters out what oxlint does not have.

A prefix table cannot express every case: sometimes the plugin swap renamed the rule as well, and then the entry needs a line in `ESLINT_TO_OXLINT_RULE` instead. `@eslint-react/no-clone-element` is oxlint's `react/no-clone-element`; `react-refresh/only-export-components` is its `react/only-export-components`; unicorn renamed `no-array-for-each` to `no-for-each` and oxlint kept the old name. That table is deliberately narrow — it maps one rule to _the same rule_ under another name, never one plugin's rule to another plugin's implementation of the same idea. `sonarjs/no-unused-vars` and core `no-unused-vars` stay two entries, because parking one is not a decision about the other.

eslint-plugin-oxlint 1.87 emits React Compiler suppressions under `react-hooks/` itself.
The exact shared React Hooks names map back to oxlint's `react/` before checking whether
oxlint earns a suppression. Keep this mapping shared with both generators: a project that
turns `react/purity` off must not lose ESLint's `react-hooks/purity` check too.

`task validate:lists` checks the lists for oxlint spellings (and suggests the ESLint name), entries filtered despite an oxlint match, disables outside the lists, conflicting verdicts under two spellings, and reasons that restate observations. The lists do not yet pass. Add the gate to `task validate` once they do.

`eslint-plugin-oxlint` suppresses an ESLint rule only while oxlint reports its equivalent. Disabling it only in oxlint hands it back to ESLint. Apply the shared disable lists differently:

- ESLint gets every name verbatim, including oxlint-only `oxc/*`. It accepts unknown rules at `"off"`, even for loaded plugins. Emit core names under `@typescript-eslint/` and `@stylistic/` too, to disable republished rules.
- oxlint rejects the whole config for an unknown rule or plugin, even at `"off"`. Filter against `oxlint-known-rules.generated.ts`: [scripts/generate-oxlint-known-rules.ts](scripts/generate-oxlint-known-rules.ts) probes the pinned binary, and `task oxlint:sync:schema` regenerates the allowlist.

Do not turn a rule on or off in `src/apps/oxlint/index.ts`, in a plugin config under `src/apps/eslint/plugins/`, in this repository's own `oxlint.config.mts` / `eslint.config.mjs`, or in a consuming project's. Add it to one of the three lists with a reason, then run `task refresh`.

A clean project can opt out of the backlog in both tools with `defineConfig(pkg, config, { temporaryRules: false })`; oxlint's `defineConfig` takes the same option in the same position.

Keep `reportUnusedDisableDirectives` off in both tools during the batch park: moving a rule to `temporary.ts` makes an existing `eslint-disable` for it unused. Turn it back on **before** per-rule triage starts so stale directives surface as rules return.

## The Two defineConfig Signatures

Both halves take the consuming project's `package.json` first, and for the same reason: which framework plugins run is a question about the project, and the manifest is where the answer is written.

```js
// eslint.config.mjs
export default await defineConfig(packageJSON, config, options);

// oxlint.config.mts
export default defineConfig(packageJSON, config, options);
```

oxfmt briefly made it three. `svelte` was gated on the manifest, because enabling it loads `prettier-plugin-svelte`, which requires `svelte/compiler`. That was the wrong shape for the question: the managed oxfmt app ships `svelte` in its own `dependencies` (see `apps.ts`), the plugin loads only when a `.svelte` file is actually formatted — 0.03s either way on a TypeScript-only run, measured — and the gate answered from the git root, so a monorepo whose svelte lived in a workspace had to turn it on by hand. A question every consumer had to answer, to save a load that never happens. The option is on for everyone now and `oxfmt.config.ts` is back to `defineConfig()`.

`defineConfig` takes no manifest, and carries no shim for one. The window existed only inside one pull request — no published version ever generated `defineConfig(packageJSON)` — so a compatibility path that told a manifest from an overrides object by its keys guarded nothing and was removed rather than kept on the chance.

One thing it left behind, deliberately:

- **A per-project managed config was tried and reverted.** It would have let each workspace answer for itself, but oxfmt carries no `projectTypes` — it formats by file type, so it has to reach a Go module's markdown — and the managed config therefore landed in _every_ detected project: measured on a bare fixture, `oxfmt.config.ts` appeared in `.github/workflows/` and `docker/` as well as the root. Splitting the runs costs nothing and was kept; splitting the config file did not pay for itself. A related finding from that fixture, worth knowing on its own: `datamitsu init` writes `.datamitsu/` links and no managed configs at all — `reconcile` is the only command that generates them.

oxlint's used to take the config first and consult no manifest, so its `nextjs`, `react`, `vue`, `jsx-a11y`, `react-perf` and `vitest` plugins ran in every project regardless of shape — a package with no Next.js in its tree still failed on `next/no-img-element` for an `<img>` in a plain React component. Passing nothing still yields every plugin, so a config generated before the parameter existed keeps working.

Two things that follow from it:

- Dropping a plugin does **not** require dropping its rules from the shared list. oxlint accepts a rule belonging to a plugin that is not enabled, as long as the severity is `"off"`; only an unknown _plugin_ name fails the config parse.
- The census has to resolve both halves against the synthetic manifest, or it reports this repository's shape and 191 react/next/vue rules leave it silently.

The object form of a `defineConfig` **adds** to the base — oxlint's, stylelint's and oxfmt's alike. Each of them spread at first, and the shape anyone would write to adjust one thing then deleted a shared decision:

- oxlint: `defineConfig(pkg, { rules: { … } })` replaced ~330 shared turn-offs with that one entry — measured at 3989 errors on this repository, including two rules that cannot both be satisfied.
- stylelint: `defineConfig({ overrides: [ … ] })` dropped the `postcss-html` wiring, because everything that makes a component parse lives in `overrides` — `.svelte` then fails with `Unknown word <script>`, `.vue` with `Unknown word </style>`, `.scss` with `Invalid double-slash CSS comment`.
- oxfmt: the same key, milder consequence — losing `jsonAlwaysExpandedOverride` reformats every JSON file in the project.

Objects merge key by key, arrays append, and the caller still wins where they name the same key. Replacing wholesale is the function form, where `base` is in hand and dropping it is visibly deliberate. A new JS-configurable tool follows this shape; the spread is the bug it looks like a shortcut for.

A project that overrides anything in its own `oxlint.config.mts` should pass that object back to ESLint as `options.oxlintConfig`. `eslint-plugin-oxlint` turns an ESLint rule off on the premise oxlint reports it, and a rule the project turned off in its own oxlint config is then reported by **neither** tool.

## Stylelint

CSS had a formatter and no linter. stylelint fills that half and only that half: everything
stylistic left the tool in 16 — removed, not deprecated — so `stylelint-config-standard` and oxfmt
make no claim on the same thing and need no `-config-prettier` between them. It runs by default,
`fix` before the formatters so oxfmt settles the whitespace its fixes leave behind.

Three things that are not obvious from the config:

- **A bare name in `extends` cannot work here.** stylelint resolves those against the _config file_,
  which is the consuming project's `stylelint.config.mjs`, so `extends: ["stylelint-config-standard"]`
  sends it looking in the project's `node_modules` — where the preset is not installed and is not
  meant to be. `src/apps/stylelint/index.ts` resolves each preset to an absolute path in the managed
  app's own install instead. It is the mirror of the `svelte/compiler` problem in the Svelte section
  below: the tool's dependencies live with the tool.
- **`import.meta.resolve`, not `createRequire(...).resolve`.** `stylelint-config-standard-scss`
  publishes `exports: { ".": { "import": "./index.js" } }` — an ESM condition and nothing else — so
  CJS resolution fails on that one preset with `ERR_PACKAGE_PATH_NOT_EXPORTED` while the rest
  resolve fine.
- **`no-empty-source` is off for the `<style>`-carrying shapes**, and not as a style preference:
  `postcss-html` hands stylelint an empty document for every component with no `<style>` block, so
  left on, the rule reports one finding per styleless component — a fact about the extraction, not
  about the file. The vue preset already does this; html and svelte have no preset that does.

**All four disable reports are on**, which ESLint's equivalent is not. `reportUnscopedDisables`,
`reportDescriptionlessDisables`, `reportNeedlessDisables` and `reportInvalidScopeDisables` turn a
blanket `/* stylelint-disable */`, a disable with no `-- reason`, a disable that no longer suppresses
anything, and one naming a rule this config never enables into errors. `reportUnusedDisableDirectives`
is off for ESLint because moving a rule into `temporary.ts` turns an existing `eslint-disable` for it
into an error, and the check is most destructive while the rule set is settling — stylelint arrives
with no backlog and no disables written against it anywhere, so the strict reading costs nothing now
and would cost a migration later. Measured: a scoped, described, still-needed disable reports nothing.

`.less` is deliberately outside `stylelintGlobs`. stylelint 17 bundles no syntax but its own CSS
parser, so Less needs `postcss-less` and a preset of its own; pointing stylelint at a `.less` file
without them fails to parse rather than reporting nothing. oxfmt still formats it — the gap is
linting, and it is stated in `globs.ts` rather than hidden behind a glob that cannot work.

## Markdown, prose and links

Markdown had ten tools on it and no owner for anything. It now has one formatter, one structural
linter, one spell checker and one link checker, and the rest are opt-in with the measurement that
put them there.

**oxfmt formats, markdownlint-cli2 reports structure.** oxfmt owns Markdown and its fenced code;
`prettierGlobs` does not claim `**/*.md`. Oxfmt 0.72 makes its native Markdown formatter the default,
so previous comparisons against bundled Prettier are historical, not a byte-identity guarantee.
Its declared Markdown divergences and the JavaScript comment-placement divergences introduced in
0.66 are intentional. Keep one formatter rather than adding Prettier to normalize the difference.
What no formatter reports is the structure: a fence with no language, a bare URL, a skipped
heading level or a table with inconsistent columns. The original measurement found 42 such
findings across 45 Markdown files, none reported by another tool in the toolchain.

Three things about `src/apps/markdownlint-cli2/index.ts` that are decisions rather than defaults:

- **Every rule that decides what the file looks like is off**, in two groups with two reasons: the 23
  — this is about layout, not about wording. Editorial rules that a formatter has no opinion on stay
  on, `MD026` (no punctuation at the end of a heading) among them. The two groups are: the 23
  that `markdownlint/style/prettier` names (copied by code rather than `extends`-ed, because
  `extends` resolves against the consuming project's config file and markdownlint lives in the
  managed app's install — the trap the Stylelint section documents), and five newer ones the preset
  has not caught up with, mostly about tables. Leaving one on does not produce a second opinion, it
  produces a loop.
- **No `fix` operation.** markdownlint's fixes edit prose — wrapping a bare URL in angle brackets,
  renumbering a list — rather than reflowing it, and `dm fix` is not where a document gets rewritten.
  `dm exec markdownlint-cli2 -- --fix <glob>` is there for when that is exactly what you want.
- **No `outputParser`, though core has a `markdownlint_cli2` one.** It drops the file name: fed a
  real report, `README.md:12 MD040/…` came back as a diagnostic carrying the row, the code and the
  message, with no `file`, which for a repository-scoped run leaves every finding unattributed. The
  raw report names the file on every line, so it is strictly better until the parser is fixed.

A directory of fragments turns off `MD041` in its own `.markdownlint-cli2.jsonc` — not
`.markdownlint.json`, which **replaces** the base configuration rather than layering on it
(`markdownlint-cli2.mjs:772` picks `markdownlintConfig || markdownlintOptions?.config`), so the whole
rule set reverts to markdownlint's defaults for that directory.

**cspell owns the dictionary; typos owns known misspellings; vale and harper are opt-in.** The first
two are not one job done twice: cspell reports a word no dictionary has, typos reports a word that is
in the dictionary but is a known misspelling of another (and checks file names), and both run on
everything rather than on Markdown alone. Both arrived as a second spell checker with no
project dictionary, so cspell — which has one — reported nothing while they reported the project's
own vocabulary back at it: vale 1294 findings, every one `Vale.Spelling` (`config` ×216, `knip` ×188,
`oxlint` ×104); harper 1762, of which 800 are spelling and the rest style preferences such as
"config → configuration" (×299) and heading title case (×167). harper also reads its user dictionary
from the developer's home directory, so its verdict differs per machine. Grammar and editorial policy
are real jobs — they are just jobs a project opts into and configures, not defaults.

**lychee is two tools, split by what they depend on.** `lychee-offline` resolves relative paths with no network at all
(99ms on this repository), checks fragments with `--include-fragments=anchor-only` — without that
flag a link to `README.md#no-such-heading` passed because the file exists, and markdownlint's `MD051`
only sees fragments inside the document it is reading — and runs everywhere; `lychee` keeps
`skip: !isCI`, because a broken relative link should fail the moment it is written and somebody
else's 503 should not fail a commit. Both read a managed `lychee.toml`, which exists because the
defaults are built for a one-off run rather than a gate — 128 requests in flight, no retry policy,
private addresses treated as real targets.

## Svelte

Three tools see `.svelte`, and each one had a different reason for not seeing it before.

- **oxlint** already did, and needed nothing: `.svelte` has been in `oxlintGlobs` all along and oxlint parses the `<script>` block natively — measured, it reports `eqeqeq` inside a component. Two of its rules skip `.svelte` and `.vue` on purpose, `prefer-const` and `no-unassigned-vars`: only the `<script>` block reaches oxlint, so a binding the template writes (`bind:this`, `bind:value`) looks unassigned, and the fix produced code the Svelte compiler rejects (oxc #25148, #26042). ESLint's copies of both are handed to oxlint there as well, so neither tool checks them in a component — left that way deliberately.
- **ESLint** did not: `eslintGlobs` listed only js/ts/html/json, and there was no plugin. `eslint-plugin-svelte` is now registered, gated on `svelte` or `@sveltejs/kit` in the manifest, with the TypeScript parser attached for `<script lang="ts">` and no `projectService` — `plugins/typescript.ts` runs `recommended`, not `recommendedTypeChecked`, so nothing needs a program, and building one for `.svelte` is where this setup gets slow.
- **stylelint** reads the `<style>` block, through `postcss-html` — see the Stylelint section above.
- **No formatter claimed it.** prettier still does not: it has no parser for `.svelte` and fails with "No parser could be inferred" rather than skipping, which is why `prettierGlobs` is no longer derived from `eslintGlobs` — both now come from a shared `scriptGlobs`, and svelte is added to the ESLint half only. oxfmt owns it instead, with `svelte: true` on for every project.

Two runtime facts that are easy to get wrong, both measured rather than assumed:

- **`svelte` has to be installed next to the tool, not next to the code.** `eslint-plugin-svelte` and `svelte-eslint-parser` both load `svelte/compiler` when the config is evaluated, and oxfmt's bundled `prettier-plugin-svelte` does the same; all three resolve from their managed app's install in the datamitsu store, where the consuming project's own copy is not on the path. Hence `svelte` in both `eslintDeps` and the oxfmt app's `dependencies` — and hence a pinned `lockFile` regeneration (`dm config lockfile <app>`) whenever either list changes.
- **The plugin's `recommended` rules block carries no `files`, and that is deliberate upstream.** Scoping it to `**/*.svelte` was tried and reverted: the premise — every rule matches Svelte-only AST nodes, so scoping loses nothing — is false. `svelte/no-store-async` reports on a plain `.ts` store module (`readable(0, async () => {})`, measured), and `svelte/no-svelte-internal` is the same shape. Only the TypeScript-parser block is scoped to components.
- **`svelte/no-unused-props` needs a TypeScript program**, asks typescript-eslint for type tools and returns an empty visitor without one — so at `error` with no `projectService` it reported nothing, measured on a component with an unused typed prop. It is parked in `temporary.ts` rather than left configured and inert; it comes back if the svelte block ever gets type-aware linting.

The census sees svelte only because `scripts/generate-rule-inventory.ts` adds `svelte` to the synthetic manifest and `probe.svelte` / `probe.svelte.ts` to the probe list — the same reason storybook and vanilla-extract needed their own shapes. 86 svelte rules, 37 at error.

## No Warn Severity

Use only `error` or `off`, never `warn`. ESLint's `--quiet` hides warnings without failing the build; oxlint has no warn tier. Put rules that should not fail the build in `src/lint-rules` with a reason.

In `defineConfig`, `raiseWarningsToErrors` raises preset warnings in place, including new ones after plugin updates. Preserve plugin registration, `files` scopes and rule options. `task validate:rule-inventory` fails if a rule still resolves to `warn`.

knip's 18 issue types answer to the same rule: [src/apps/knip/index.ts](src/apps/knip/index.ts) emits every one of them as `error` or `off`, overriding knip's own default of `warn` for `cycles`.

## Knip

Managed binaries outside `node_modules` do not satisfy the workspace dependency checks for the eslint, prettier, oxlint, commitlint and cspell plugins. File- or field-triggered plugins (GitHub Actions, pnpm) are unaffected. List managed configs as entry points, grouped by their declared `scope` to avoid per-workspace "Refine entry pattern" hints for git-root configs. This restores import reachability, not plugin interpretation: use `ignoreDependencies` for dependencies referenced only by strings.

With `workspaces`, knip resolves even the root by workspace name. `"**"` does not match `.`; without `"."`, the root uses built-in defaults. As its last step, `defineConfig` moves workspace-only options under `"."`. Check the installed knip before adding an option:

- Move `entry`, `project`, `paths` and `ignoreMembers`.
- Leave `ignoreExportsUsedInFile`, `includeEntryExports` and `ignoreGlobalBinaries` at the top level (`workspace ?? top-level`); `ignore`/`ignoreFiles` are registered globally there.
- Leave `ignoreBinaries`, `ignoreDependencies` and `ignoreUnresolved` in place: knip combines them with the root values. Leave `ignoreIssues`: aggregation skips `"."`.

Knip selects only the most specific workspace key. `defineConfig` automatically merges the shared `"**"` block into each concrete non-root workspace key a caller adds, preserving its managed-config entry points.

**Playwright:** knip executes `playwright.config`. If loading fails, the plugin loses even its default entries. In knip 6.32.2, importing a config module directly instead of through a barrel that loaded generated `.tsx` fixed nine configs. Since 6.37.0 the loader parses JSX, but other load errors still disable the plugin.

Do not add `*.test.*`/`*.spec.*` entries to the base. The plugin joins `testMatch` to `testDir`; a blanket glob hides load failures and makes abandoned specs, their imports and other runners' specs look reachable. A project that needs a temporary fallback sets it in its own `knip.config.js`:

```js
export default defineConfig({
  playwright: { entry: ["**/*.@(spec|test).?(c|m)[jt]s?(x)"] },
});
```

Use the narrowest patterns covering what Playwright runs. Remove them once its config loads. A blanket `*.spec.*` also hides abandoned specs from other runners. These patterns restore only test entry points, not the plugin or a successful exit.

Since knip 6.35.1 a config load failure exits 2 even with `--no-exit-code` and zero findings. Both `datamitsu check` and `datamitsu lint` fail; the JSON omits the error. Run `datamitsu exec knip` and look for `Error loading …` on stderr.

Do not suffix test patterns with `!`: only suffixed patterns count in `knip --production`. Default analysis includes tests; production analysis still reports code reachable only through tests.

### The default is the bar, and `adopted` only narrows

`defineConfig(overrides, { adopted })` names the issue groups a project reports; everything outside the list is `off` unless the config names that issue type in `rules`, which still wins per type.

Default to every group knip itself reports. Keep narrowing decisions in the consuming project's `knip.config.js`, not in the shared preset. Like `permanent-enabled.ts`, this makes the decision explicit. A project adopting knip over existing code starts with `{ adopted: ["correctness"] }` (defects rather than debt), then removes the restriction as coverage grows. Once most code passes a group, prefer `ignoreIssues` for specific paths and issue types over disabling the group: new code stays covered, and the exceptions can shrink like `src/lint-rules/temporary.ts`.

Knip withholds two groups by default. `cycles` requires `include`, which prevents CLI narrowing as described below. A project can adopt it where that tradeoff is acceptable. `namespaces` stays off: knip follows explicit member access through `import * as` but cannot resolve a namespace passed whole. `nsExports`/`nsTypes` would require import restructuring, not dead-code removal.

Knip adds types set to `off` to `exclude`; severities in `rules` never add to `include`. Thus `cycles`, `nsExports` and `nsTypes` need more than an error severity.

Excluding `dependencies` also excludes `devDependencies` and `optionalPeerDependencies`. Exclusion applies last; config `include` cannot undo it. `rulesFor` throws for contradictions such as `defineConfig({ rules: { devDependencies: "error" } }, { adopted: ["correctness"] })`. CLI `--include dependencies` can remove a direct exclusion _before_ expansion.

This package implements `include` generation. `defineConfig` emits no `include` by default. When adopting a withheld type, emit **every reported type**: `nsExports` and `nsTypes` add to knip's defaults; other types, including `cycles`, replace them. Knip unions config and CLI includes, so `--files`, `--exports`, `--dependencies` and `--include <type>` no longer narrow `datamitsu exec knip` output. In knip 6.32.2, `knip --files` returned all fifteen types. `--exclude` still wins. This cost matters because `skip: !isCI` leaves local users reading that report directly.

An entry in `ignoreDependencies` or `ignoreIssues` carries a reason, and the reason says which of two things it is: something knip structurally cannot see, or debt nobody is paying down yet. Do not mix the two in one block.

### What belongs in the usage guide, which is almost none of this

Document `adopted`: it is package-specific and gives existing projects a way to start with a passing gate. Keep the guide useful to a new project installing today. Do not restore the Playwright fallback, production mode or the issue-group table unless they meet that test; keep investigation details here instead of duplicating knip's documentation.

### Suppressing one export: `@knipignore`, not `ignoreIssues`

The base sets `tags: ["-knipignore"]`. Prefer `/** @knipignore */` above a single export: knip emits a tag hint when the export is used again. Use `ignoreIssues` for a whole generated surface; path suppressions outlive individual exports.

The tag name is one unbroken run of letters. knip matches `/[a-zA-Z]+/` against the entry and keeps only the first match, so `-knip-ignore` silently means `@knip`, and `-knipIgnore` is a different tag from `-knipignore`.

knip's own `@public`, `@internal`, `@beta` and `@alias` need no configuration and are always active. `@internal` is the production-mode counterpart: it marks an export that exists for tests, so `knip --production` stops reporting it.

Neither `treatConfigHintsAsErrors` nor `treatTagHintsAsErrors` should be set. Both raise the exit code, but neither hint appears in the JSON reporter datamitsu parses; the run fails with an empty report.

### Cache, and why there is no fix operation

`--cache --cache-location {toolCache}/.knipcache` is on. Knip's `FileEntryCache` keys per-file extraction on size and mtime, not a content hash, so restoring identical bytes with a new mtime still invalidates that entry. Its file is named after the knip version. Knip 6.41 also persists glob and gitignore caches; the dependency graph is still rebuilt every run. The earlier 6.32.2 measurement was 32s cold against 23s warm for 18 MB, not a claim about 6.41 performance.

Do not wire a `fix` operation into `datamitsu fix` or `datamitsu check`. False positives can strip a live `export`; `@knipignore`, `ignoreIssues`, `ignoreDependencies` and `ignoreUnresolved` exist for these cases. Review the report before running `--fix` explicitly:

    dm exec knip -- --fix --fix-type exports,types

`--fix-type exports,types` even there. knip's unrestricted `--fix` also rewrites `package.json` and the pnpm catalog, which leaves the lockfile describing a manifest that no longer exists, and a fixer cannot run the installer that would reconcile the two. Removing files needs `--allow-remove-files` on top of that. `--format` is out as well: knip would resolve a formatter of its own through Formatly, while prettier and oxfmt run from the configuration that decides.

### Why `scope: "repository"`, and what the globs are for instead

Use repository scope. `knip [options]` accepts `-W/--workspace` and `-D/--directory`, not file arguments (`per-file`). A `per-project` run misses uses in sibling packages. Run once from the root for the full workspace graph.

Keep `globs` empty (match all discovered files). For repository `scope`, globs decide whether to run, not which files to scan. An incomplete list silently skips checks when only an unlisted input changes: HTML, stylesheets, extensionless configs (`.prettierrc`, `.swcrc`, `.graphqlrc`), lock files and consumer compiler inputs can all affect reachability.

### `skip: !isCI` — knip runs in CI and on demand, never in a hook

Hooks run checks that narrow to staged files. Unlike a `glob:` over `{staged_files}` in `lefthook.yml`, `--file-scoped` cannot narrow knip: it would scan the whole repository on every commit.

Keep `skip: !isCI` and `skipReason: "runs in CI only"`, as for trufflehog. The tool-wide `skip` also disables local `datamitsu lint --tools knip`. Use `dm exec knip` locally: knip discovers `knip.config.js` and prints its symbols reporter rather than the parser's JSON.

## Lint Rule Inventory

[src/lint-rules/rule-inventory.json](src/lint-rules/rule-inventory.json) is a committed census of every rule ESLint and oxlint know about, with the severity this config gives it. Nothing reads it at runtime — its whole job is to be diffed.

A plugin bump that adds, removes or re-categorises a rule is otherwise invisible until the new rule starts firing in whichever project upgrades first. With the inventory committed, the same bump lands as a reviewable diff, and the decision — leave it on, or park it in `permanent-disabled.ts` / `temporary.ts` — is made once, here, before any consumer is affected.

- `task validate:rule-inventory` — fails when the live rule set has drifted from the committed one, printing added / removed / re-severitied rules. Runs in `task validate` (so `task refresh` covers it), in pre-commit and in CI, so a drifted rule set cannot be committed or merged.

  Pre-commit therefore builds first, at priority 50. It has to: `datamitsu-check` runs before it with `stage_fixed`, so the formatter can rewrite a source after the last build, and the gate would then refuse to answer on every commit that reformatted anything.

  It refuses to answer against a stale build. The census reads the built package, nothing in pre-commit builds, and the result was a gate that green-lit a changed `temporary.ts` by reporting on the previous rule set — a stale pass is worse than no gate, because it reads as a review. Two things that implementation gets wrong if written the obvious way: the reference has to be `dist-inline-eslint-config`, not the `.datamitsu` link, whose mtime is when that _content_ was first stored; and it must walk only the directories the lint config is built from, because `inline-config`, `apps/oxlint/schema.d.ts` and the census's own two outputs are outputs that happen to live under `src/`.

- `task rules:inventory` — rebuilds, then regenerates the file: accepts the current rule set as reviewed. This is the one step `task refresh` deliberately leaves to you — run it _after_ deciding what the new rules should be, not to make the build pass.

`build` carries no inventory gate, and that is deliberate. The census is taken _from_ the built package, so a gate inside `build` can only run after the build it is gating — which makes every intentional rule change fail the first build by construction, and leaves no command able to accept the change without building first. Gate in `validate` (so `refresh` and pre-commit still refuse a drifted set), build inside `rules:inventory` (so accepting is one command), and the cycle disappears.

The drift report prints rule names in the ESLint spelling the lists use, not oxlint's — it is the place those names get copied from, and printing `typescript/x` there was teaching the spelling the lists reject.

The same census is also emitted as [rule-names.generated.ts](src/lint-rules/rule-names.generated.ts) — string-literal unions of every rule name both tools know. `permanent-disabled.ts`, `permanent-enabled.ts` and `temporary.ts` are keyed by `KnownRuleName`, so a typo, or a rule a plugin dropped in an upgrade, is a `tsc` error instead of a line that silently stops doing anything. Types only, so the bundle strips them — but `task build` also emits declarations with `tsc` (`tsdown.config.ts`), so a name `KnownRuleName` does not know fails the build, and `rules:inventory` builds before it regenerates the file. A rule a plugin dropped is caught the ordinary way: the regenerated union loses it and the next build names the stale entry. A rule a plugin _added_ cannot be listed first: accept the inventory once with the rule at its preset severity, then add the entry, then accept again.

Coverage, and its limits — see [scripts/generate-rule-inventory.ts](scripts/generate-rule-inventory.ts):

- Both halves resolve against one synthetic `package.json` that turns on every dependency-conditional plugin, so the census is the union across project shapes rather than this repo's own shape. Plugins datamitsu-config ships disabled by default are excluded — a rule that cannot fire is noise.
- ESLint is resolved for eight shapes — `.tsx`, a test file, an e2e spec, `.cjs`, `package.json`, a story, `.storybook/main.ts` and `.css.ts` — because a block that scopes itself is invisible to a single probe. The last three were missing, which recorded 11 storybook rules as `off` while they ran at `error` and left the vanilla-extract plugin out of the census entirely: it registers itself _inside_ the `**/*.css.ts` block, so none of its rules had a name to be written down under.
- Core ESLint rules are seeded from `builtinRules` in `eslint/use-at-your-own-risk`. The `@` entry in a resolved config — flat config's name for the core set — is a Proxy with zero own keys, so enumerating it returned nothing and all 292 core rules silently missed the census. 108 of them were absent from `KnownRuleName` entirely, which made `"camelcase"` or `"no-restricted-syntax"` in either list a `tsc` error, and an ESLint bump that added a recommended core rule produced no drift diff at all.
- oxlint comes from `oxlint --print-config` against that same synthetic manifest, which reports severity after categories, plugin defaults and our rule list have all been applied. Not the repository root: oxlint's framework plugins are gated on dependencies, so a root run would census this project's shape and drop 191 react/next/vue rules that consumers still run.

## Flat Config Block Names

Config blocks this package appends are named `s0/*` (`s0/ignores`, `s0/disabled-rules`, `s0/config-file`). Use that prefix for new blocks: these are shibanet0's rules, not datamitsu's or a plugin's, and consumers select blocks by name when overriding.

## Commands

`task refresh` is the normal command. It regenerates everything derived from the sources in this repo and then checks the result — build, docs, and the guards. Reach past it only when you know which single task you want; `task --list` shows them all. For configuration-source and generator changes, also complete the reconciliation workflow below; `refresh` does not perform it.

    task refresh              build → docs:generate → validate
    task refresh:registries   update every registry from upstream, then run `task refresh`
    task build                produce the package (no gates — see Lint Rule Inventory)
    task validate             blocklist + parsers + pins + rule-inventory
    task validate:lists       read the three rule lists as lists — not in `validate` yet, see above
    task rules:inventory      accept the current rule set as reviewed

`task validate:pins` checks that dependency literals in the root `datamitsu.config.ts` match the package manifest, including `packageManager`. A registry update can otherwise leave a stale literal that restores old versions during reconciliation. This gate complements the required build-and-reconcile workflow; it does not replace inspecting rendered files.

## Pinning the datamitsu Build

Bumping `@datamitsu/datamitsu` in `package.json` drags three other pins with it, and `task refresh` now carries all of them — `task sync:datamitsu-version` is where they live:

- `getMinVersion()` in `src/datamitsu-config/datamitsu.config.ts`.
- The `@datamitsu/datamitsu` entry in the package.json that the root `datamitsu.config.ts` manages for this repo — the same version stated twice, previously with nothing keeping the two equal.
- `src/datamitsu-config/parsers.ts`, the WASM output-parser pin, generated by [scripts/sync-parsers.ts](scripts/sync-parsers.ts) from `node_modules/@datamitsu/datamitsu/parsers-oci.json` — the file the pinned build itself publishes, so the pin cannot disagree with the binary it targets.

The parser pin is the one that used to rot silently: its digest and content hash change on **every** release, because the module's version string is compiled into it, and a stale pin still resolves and still verifies — it just serves the previous release's parser. `task validate:parsers` fails when it drifts, in `task validate` and now in pre-commit too.

A fourth thing moves with the bump: the Dockerfiles, whose base image is `ghcr.io/datamitsu/datamitsu:<version>`. They are generated by [scripts/generate-dockerfiles.ts](scripts/generate-dockerfiles.ts), not by the sync, so the pre-commit hook runs `docker:generate` after `sync:datamitsu-version` and stages both together. It used to stage `docker/Dockerfile` and `docker/Dockerfile.alpine` without regenerating them — a leftover from when the sync script wrote the `FROM` lines itself, stale from the commit that introduced it, which says so in a comment — while `parsers.ts` and the root `datamitsu.config.ts`, the two files the sync actually writes, were not staged at all.

Do not hand-edit `parsers.ts`.

The minimum core is a feature floor, not an install pin: `sync:datamitsu-version`
must reject stable pins below the existing floor rather than lower it. Config
generators use native `merge`, introduced in stable 0.5.2; 0.5.1 is unsupported.
The package-local wrapper pins 0.6.0; named-runtime execution and verified CPython
provisioning require that stable core. Keep the parser pin and generated Docker base tags aligned.

`task test:fresh-init` checks both sides: a SHA-256-verified published 0.5.1 binary
must reject the built bundle before any managed-content callback runs; the pinned
core must initialize the bundle as the auto config and then through a before-config
layer before reconcile/check. Testing only the dev core in a layered fixture does
not establish compatibility with a global stable binary.

Two things are deliberately outside `refresh`:

- **Registries** (`pull:*`) change because upstream published something, not because this repo did. Network access and a release-age policy make them a separate, deliberate step.
- **`task rules:inventory`** accepts a changed rule set. Automating it inside `refresh` would defeat the review gate it exists to provide.

Before completing a change to configuration sources or their generators in this repository:

1. Run `pnpm build` to rebuild the package and initialize its managed content.
2. Run `pnpm dm config reconcile --dry-run` and review the proposed changes for unrelated edits
   or conflicts with the user's work. Resolve conflicts before writing; do not overwrite user changes.
3. Run `pnpm dm config reconcile` to apply the rebuilt configuration to this repository.
4. Inspect the rendered files and exercise the affected tools, then run `pnpm dm check`.

This workflow authorizes reconciliation here without a separate request, unless the user has
restricted writes for the current task. Build, init and dry-run alone do not complete a
configuration-source change. If reconciliation fails or is explicitly prohibited, report the
blocker rather than declaring the application verified. Do not stage, unstage or commit changes
without explicit authorization.

Never bypass chain-hash verification. Compare incoming content with project overrides before
updating an `expectChainHash` pin, including `package.json` and `pnpm-workspace.yaml`.
Use `pnpm dm` so development-mode inputs match the project layer; `validate:pins` checks the
package template, not the upstream chain hashes.

## Lefthook Proxy Tests

The proxy integration suite requires a POSIX shell and signals, the built proxy bundle, and the installed upstream Lefthook binary. Run `pnpm build` before `pnpm test`; missing artifacts fail the suite.

Every fixture subprocess must use `fixtureEnvironment` from `src/apps/test-support/env.ts`. It removes inherited `GIT_*`, `LEFTHOOK*`, and `DATAMITSU_LEFTHOOK_*` values before applying explicit test overrides. Git hooks can export paths into the contributor's real repository, and nested proxy state can suppress isolation; inheriting either makes fixture tests unsafe.

## Bun Helper Scripts

`lefthook-sort` and the public `lefthook` proxy are Bun apps. Their `bun` entries in `src/datamitsu-config/apps/lefthook-sort.ts` and `src/datamitsu-config/apps/lefthook-proxy.ts` select the pinned runtime from the registry; their entrypoints use Bun shebangs. Keep both aligned so managed execution and direct execution use the same runtime. Regenerate Dockerfiles and app documentation with `task refresh` after changing an app runtime.

Integration tests resolve installed Bun apps through `installedBunApp` in `src/apps/test-support/managed-bun.ts`. It reads `datamitsu source status --json` without installing anything and preserves the managed runtime arguments and environment. Build first; do not substitute a system Bun executable in these tests.

Installed Lefthook hooks pin the managed Bun directory on `PATH` and set isolated `BUN_OPTIONS`, alongside the public proxy and upstream paths. Preserve this binding: Git may launch hooks without datamitsu or Bun on the ambient `PATH`. The real-hook integration test exercises that case.

The proxy declares its private upstream through `dependsOn` and binds its exact executable with
`runtimeEnv.DATAMITSU_LEFTHOOK_UPSTREAM` using `${APP_BIN:dm-internal-lefthook-upstream}`.
Neither app needs `required`: when `lefthook.yaml` exists, every init executes
`lefthook install --force`, provisioning both apps and rebinding hooks to the current paths.
Smart-init does not select the proxy by itself, because it declares no links. Init does not
create `lefthook.yaml`; consuming projects must have the managed config before hooks are installed.
An invalid exact upstream binding fails without PATH fallback to avoid switching versions.
Integration tests obtain this binding from the managed app's `source status --json` environment;
never scan the store or probe binaries to discover it.

## Managed Linter Runtimes

The managed `eslint`, `oxlint`, and `oxfmt` apps run on pinned Bun. Their `bun.binPath` must point to the package JavaScript entrypoint, never a `node_modules/.bin` shell shim. Preserve the dependency lock files, ESLint package extensions, and oxlint type-aware engine when updating these apps. Run `task refresh` to regenerate app documentation and Docker/OCI paths after runtime changes.

The default uv runtime's Python version and SHA-256-pinned download catalog live in
`src/datamitsu-config/registries/runtimes.json`. Apps whose locked wheels do not
support it select `uv-python314`, whose version and catalog live together in
`src/datamitsu-config/registries/uv-python314.json`, with the blocking dependency
explained beside `uv.runtime`. Refresh both catalogs through `task pull:runtimes:update`;
the compatibility generator preserves its separately declared Python version.
Keep the default current rather than downgrading every app.
Lock generation alone does not prove installability: run the real locked, no-build
install on each selected interpreter before removing a compatibility binding.
The managed JDK 27 deliberately drops macOS x64; the remaining JVM platform loss is accepted,
not an asset-detection error. Do not suppress ktlint's upstream JVM startup warnings.

golangci-lint is a locked Go app built with the managed Go runtime, not a binary
release entry. Keep its compiler at least as new as the Go version being analyzed:
the standard importer embedded in Go 1.27.0 cannot read the V5 export data introduced
in Go 1.27.2. Do not disable `gocritic` or restore the prebuilt executable as a fix.

## pnpm Workspace Migration

The `pnpm_workspace_yaml` managed config converts legacy `trustPolicy: { allowDowngrade: [...] }` into `trustPolicy: no-downgrade` and `trustPolicyExclude` during reconciliation. Merge existing exclusions without duplicates and preserve package selectors exactly. Modern scalar policies must retain their value. Keep this migration in the content callback so it applies to consuming projects; editing this repository's workspace file cannot migrate consumers. Test with isolated YAML inputs, including repeated reconciliation and malformed lists.

The same callback brings a file up to pnpm 12, which fails every command on a workspace setting it does not recognize (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`). It drops the settings pnpm 12 removed — `confirmModulesPurge`, `ignoreDepScripts`, `ignorePatchFailures`, `managePackageManagerVersions`, `packageManagerStrict`, `packageManagerStrictVersion` and `useNodeVersion` — carries `allowNonAppliedPatches` over to `allowUnusedPatches` unless the file already has the new name, and replaces the deprecated `auditLevel` with `audit.level`, keeping everything else the project holds under `audit` (`pnpm audit --ignore` writes its exceptions there). A non-mapping `audit` stops reconciliation rather than being overwritten. The rejected keys were measured against the pinned pnpm 12.5.1; check a new pnpm major the same way before trusting the list.

## Docker CI Cache

PR Docker builds use no GitHub Actions cache. The smoke check runs in the same job as the multi-platform build and loads the amd64 image from the builder that just built it. Do not bring `cache-to: type=gha` back: a cache a PR writes is visible only to that PR, no build step ever came back from it, exporting it took 9-31 minutes per variant, and the repository cache ran past its quota until evictions failed builds.

The Lefthook proxy's `versionCheck.args` uses `--proxy-version` to verify the proxy artifact itself.
Dependency-aware Docker slices also provision the private upstream. Keep the proxy version probe
independent of upstream resolution; ordinary `version`/`--version` calls and the final image smoke
test must still execute the upstream binary. The Alpine generator force-includes the static
private upstream because its registry entry only declares glibc; `dependsOn` does not add platform metadata.

## Kotlin

ktfmt is the only Kotlin writer. The shared Kotlin defaults live in
`src/datamitsu-config/kotlin-defaults.ts`; the managed `.editorconfig` preserves project overrides
and inserts new defaults before existing narrower sections. Keep block indentation, continuation
indentation and width derived from `indentSettings`, not Kotlin-specific copies.

ktlint uses JSON and its `ktlint` tool parser. Its preset is off, with naming and syntax rules
enabled individually; do not enable layout rules alongside ktfmt. `@Composable` functions need
the explicit function-naming exemption. IntelliJ's import thresholds and package allowlist must
agree with the wildcard-import check. See `website/reference/kotlin.md` for every enabled rule.

Kotlin operations use the default cache and declare `.editorconfig` in `invalidateOn`. A nested
configuration change may require a manual local execution-cache reset. CI uses a fresh execution
cache. Do not disable the shared local cache to compensate for nested configuration files or add
nested EditorConfig tracking to core.
Both parser descriptors use UTF-16 columns. The new `ktfmt` parser
key is published in the parser module pinned to core 0.5.2; parser and package pins
must move together so initialization never relies on unpublished local parser work.

The Kotlin file-name rules live in `alint-defaults.ts`, not ktlint: they accept Unicode letter
stems, platform suffixes and Gradle script names. Keep `ktlint_standard_filename` off so a second
tool does not own that concern.

Root whole-file generators must emit the order their formatter preserves. The package manifest
is a JSON template in `datamitsu.config.ts` so object-key linting cannot rewrite it to alphabetical
order while `sort-package-json` writes conventional manifest order. Keep the Lefthook template
in the output order of `lefthook-sort` and yamlfmt too; otherwise a successful reconcile changes
the input of the next chain-hash check as soon as formatting runs.

Pass ktlint explicit file paths in operations. With the pinned CLI, a quoted absolute glob can
walk from the filesystem root and fail on unrelated protected directories; keep `{files}` rather
than turning the selection into an absolute glob or stdin pattern stream.

## Protobuf ownership

Protolint fixes supported rule violations before `buf-format` settles Protobuf
layout. Both use the same configured rules for fix and lint. The `buf` schema linter runs per
`protobuf-project`, detected by `buf.yaml`, at unit granularity so imports and
package-wide rules are checked together. Bare `.proto` files still get formatting
and protolint. A Buf workspace owns the module paths declared in its configuration;
nested workspaces must declare module exclusions in the enclosing `buf.yaml`.
The managed generator preserves v1/v2, module paths, dependencies and rule overrides.
Use the core merge(...) helper to combine Buf defaults with existing YAML settings;
project arrays replace default arrays rather than appending to them.
Buf uses the published `github-annotations` parser with `--error-format github-actions`;
the legacy `buf` parser reads stderr, while the current lint reporter writes stdout.
Formatting differences are native diffs and fail by process exit code; syntax errors
are parsed annotations. Buf's native layout has no configurable indent or line width.

Protolint uses native -fix followed by lint through the Go protolint-fix adapter:
the CLI reports pre-fix findings and exits 1 even after fixing them. Only the
verification result is reported; parse/startup failures from fix still fail.
Its two `exec.CommandContext` calls use the exact `{bin:protolint}` dependency binding and
configuration-owned argv, without a shell. Keep the scoped G204/G702 annotations on
those calls rather than disabling gosec for the adapter or accepting arbitrary discovery.
Its explicit managed `.protolint.yaml` disables default
rules and selects repeated-field pluralization and the shared maximum line width,
which Buf STANDARD does not check. Project overrides survive reconciliation.

## Python and SQL ownership

ty invokes its native binary with the Python sources Datamitsu assigns to each project.
It declares unit granularity explicitly: a narrowed source request requires the owning
unit's full source set, not a recursive parent-directory scan. Only Python sources belong
in argv; ty parses TOML as Python when passed as a positional path. pyproject.toml and
ty.toml remain cache guards, not source globs or standalone selection triggers.
A datamitsu config marks a source-only root, and ty.toml marks a Python type-checking unit
without requiring a generated package manifest. No file/Git discovery wrapper is used.
sqruff is the sole SQL writer; request JSON and parsing errors in both operations.
Its canonical config is sqruff.toml, supported natively by the pinned 0.40.0.
SQL defaults use PostgreSQL, max_line_length = 0, lowercase names/keywords,
shorthand casts, required semicolons and aligned aliases/column definitions.
Use the core merge(...) helper for nested project overrides without dropping the
remaining shared rule settings; do not duplicate the helper in this package.
The stable minimum is 0.5.2 because 0.5.1 lacks merge; unstable builds skip the
version gate and must be pinned to a build that includes the helper.
The generator reads TOML only and preserves existing TOML settings. Never add
.sqruff or .sqruff.ini to otherFileNameList: existing configs must not be deleted.

Keep sqruff at 0.40.0 until its PostgreSQL parser regressions are fixed. Version 0.41.0
rejects `select rightarg from demo;` and `select id from demo for update limit 1;`,
both accepted by 0.40.0. Do not suppress parse errors or change dialect to make the bump pass.
When retrying the bump, also account for its new 20 KB file-skip limit and core AL10 rule.

vacuum remains a native app for explicit API-project integration, not a default tool.
Do not restore broad JSON/YAML scanning, a content-discovery adapter, or a second API
checker without a concrete project setup. Its parser keeps annotation starts and drops
unreliable end positions from the pinned reporter; legacy JSON ranges are retained.

The published parser pin and core package pin must come from actual releases. Source
changes do not publish the ty parser or the explicit-unit widening behavior.
validate:pins reads the managed package.json template through the TypeScript AST
and parses its cooked JSON text. Do not replace this with indentation-based
matching or silently skip dependency comparisons when the template is missing.

## Helm templates

`helm-chart` is detected by `Chart.yaml`. Run helmfmt's native chart mode with
`{target}`, per-project scope and no source globs: the planner selects detected
charts, and the formatter walks only each chart's `templates/`. Broad source globs
would assign unrelated `templates/` directories to the planner's root fallback.

The tool uses unit granularity with `.helmfmt` in `invalidateOn`; HOME and
USERPROFILE bind to `{cwd}` so a developer's home config cannot change its output.
Native helmfmt has no config-path argument, so `.helmfmt` is project-scoped and not
ejectable. Its indent default comes from `indentSettings` and project overrides win.
The managed config leaves `printf` indentation alone: the native default moved a
standalone call out of a YAML block scalar and made `helm template` fail. Keep it
disabled alongside upstream's `include`, `tpl`, `template` and `toYaml` defaults.
Verify that rendered output survives formatting, including when a project overrides
another nested rule; a shallow merge drops the shared `printf` decision.

Native chart mode requires `templates/` to exist; a template-free library chart passes
Helm lint but fails helmfmt 0.7.0. yamlfmt 0.21.0 also needs a second pass on some
comments from `helm create` values. Do not hide either with a wrapper, a global skip,
or a weakened linter; they are native limitations, not successful checks.
The package does not manage `.datamitsuignore` files. Datamitsu 0.6.0 exposes only static
root `ignoreRules`, so chart locations cannot be discovered dynamically by the config layer.
YAML-suffixed files under chart `templates/` therefore also reach repository-scoped YAML
tools and may fail parsing or be reformatted. Do not add a global `templates/**` exclusion:
it would also skip unrelated template directories. Keep `Chart.yaml` and `values.yaml` on
the ordinary YAML path. The static upstream needs force-inclusion in Alpine generation
because the registry deduplicates its musl record.
