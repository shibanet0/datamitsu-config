---
name: update-registries
description: Finish a dependency update in datamitsu-config after the user has pulled one — review what changed upstream, regenerate everything derived from it (lock files, pins, census, docs), migrate what the new versions require, run the checks, and report. Covers every registry under src/datamitsu-config/registries/ (uvVersions, nodeVersions, githubApps, externalApps, runtimes), a datamitsu core bump, and the wrapper's own dependencies in package.json. Use whenever the user says they pulled or updated a registry, bumped the core or dependencies, and asks to check, review, regenerate lock files, migrate or "bring everything up to date" — including informal requests like "I updated githubApps, take a look" or "the node registry moved, sort it out". Never pulls or updates a registry itself.
---

<!-- cspell:ignore illumos musllinux Temurin -->

# Update Registries

The human decides **what** to update; this skill does everything **after** that decision. The user
runs `task pull:<registry>` or `task pull:<registry>:update` (or edits a version by hand), and asks
you to finish the job: find out what changed and why it matters here, regenerate what is derived
from the registries, carry out the migrations the new versions require, prove it works, and report.

## Hard rules

- **Never pull.** Do not run `task pull:*`, `task refresh:registries`, or any
  `datamitsu devtools pull-* --update` against the real registry files. Whether to update, and to
  what, is always the human's call. Pulling into a **scratch copy** to preview something is fine.
- **Hands off the git index.** Never `git add`, `commit`, `reset`, `stash`, `checkout`, or
  `restore`, unless the user explicitly asks for a commit. The user stages files by hand to see your
  working-tree edits as a clean diff against their staged state; any write to the index destroys
  that view. Read with `git diff HEAD`, `git diff --cached` and `git show HEAD:<path>` only. Registry
  files you did not touch may be the user's next pull in progress; leave them alone.
- **Propose, don't decide.** In scope without asking:
  - regenerating lock files and everything `task refresh` derives;
  - mechanical syncs that validators or tests enforce: pins, the root literal, `constants.ts`;
  - migrations that keep an existing decision, such as a renamed rule keeping its verdict;
  - the fixes a bump needs in order to build, type-check and pass its tests.

  Anything that changes a verdict, a default or a consumer-visible behavior is a proposal with a
  recommendation, and waits for the user.

- **New lint rules are parked, not judged.** Every rule an update brings in at `error`, in ESLint or
  oxlint, goes into `DEPENDENCY_UPDATE_RULES` in `src/lint-rules/temporary.ts` with the reason
  `new in <plugin> <version> — off until decided`. This is the user's standing policy. Rules a
  release adds outside its preset are already off and need no entry.
- **No Docker builds.** CI builds and smoke-tests the images. Do regenerate the Dockerfiles
  (`task refresh` does) and do run every other check.
- **Read the whole upstream diff**, whatever the size of the bump. For monorepos, read the full
  diff of the packages this repo ships and the commit log for the rest, and say which you did.

## Step 1 — establish what changed

1. `git diff --cached --stat` and `git diff HEAD --stat` show what the user staged and what is left.
2. For each changed registry, list `name: old -> new` and mark majors and 0.x minors. Useful
   one-liners:
   - `git show HEAD:src/datamitsu-config/registries/<file>.json > /tmp/old.json`, then `jq` over
     both files;
   - for githubApps, compare each bumped app's platform set (`os/arch/libc`), `binaryPath` and
     `contentType`, old against new.
3. Look for versions that did not propagate — each of these has happened:
   - `package.json` against the literal in the root `datamitsu.config.ts`, both the dependencies
     and `packageManager`: run `node scripts/validate-pins.ts`;
   - `nodeVersions.pnpm` against the pnpm runtime in `runtimes.json` and the `packageManager` in
     `package.json`. `nodeVersions.pnpm` is what consumers' managed `package.json` pins;
   - `runtimes.json` node against `runtimeVersions.node` in `src/datamitsu-config/constants.ts`,
     `.node-version` and `devEngines`. `scripts/__tests__/runtime-versions.test.ts` enforces this;
   - a core bump: `task build` runs `sync:datamitsu-version`, which updates the literal,
     `getMinVersion` (stable versions only), `parsers.ts` and the Dockerfile `FROM` lines.
4. On a core bump, read "Recent changes to review" in
   `.datamitsu/ai/agents/datamitsu-config-author.md` and act on every entry newer than the
   previous core.

## Step 2 — regenerate lock files

`datamitsu config lockfile <app>` reads the **built** config, so build first
(`pnpm exec tsdown --config ./tsdown.config.datamitsu.ts --config-loader unrun` and move the output
to `datamitsu.config.base.js`, or `task build:datamitsu-config`).

- `pnpm --silent dm config lockfile` with no argument lists every lock-capable app by runtime.
- Regenerate the locks of whatever the bump touches:

  | Bump           | Apps to re-lock                                                                              |
  | -------------- | -------------------------------------------------------------------------------------------- |
  | uv registry    | its uv apps                                                                                  |
  | node registry  | every bun and node app whose dependencies include a moved package (eslint depends on dozens) |
  | pnpm runtime   | all bun and node apps                                                                        |
  | Python runtime | all uv apps                                                                                  |
  | Go runtime     | the Go apps, only if lock semantics changed                                                  |

- Before regenerating, save each app's current lock: the `lockFile` value from
  `pnpm --silent dm config show`. Find where it lives by searching `src/datamitsu-config/` for
  the exact string. lefthook-proxy, lefthook-sort and sort-keys share one identical lock.
- Generate in parallel, for example with `xargs -P 6`, and set `DATAMITSU_INSTALL_TIMEOUT=3600`:
  big wheels and archives exceed the default. The lock is the last stdout line starting with `br:`
  (base64 of brotli). A failure prints the reason above it.
- Patch each new lock into the source by exact string replacement, and count the replacements.
- Diff old against new by decoding the base64 and brotli layers:
  - list moved packages and flag transitive majors;
  - for uv, check that every compiled dependency still has wheels for our Python on glibc and musl
    amd64/arm64 and on darwin amd64/arm64. Installs use `--locked --no-build`, so a dependency
    that ships only an sdist breaks them, and the Alpine image needs musllinux wheels.
- If `pnpm dm …` itself fails with ERR_PNPM_OUTDATED_LOCKFILE, pnpm is re-running `prepare`
  (`verifyDepsBeforeRun: install`) and looping. Call `node bin/datamitsu.js …` directly to break the
  loop. Everywhere else, use `pnpm dm`.
- A new install script shows up as `ERR_PNPM_IGNORED_BUILDS`. Read the script and decide:
  - `allowBuilds: { pkg: true }` in the app's `files["pnpm-workspace.yaml"]`;
  - or `false`, with a comment either way.

  pnpm 12's own package needs `true`: without it, it runs through Node and does not start on
  Windows.

- A fix release still inside the minimum release age can be taken early only with an explicit
  `minimumReleaseAgeExclude` entry. Add it in the app's `pnpm-workspace.yaml` and, if the repo
  installs it too, in the root one. Comment the reason and the date it can go.

## Step 3 — build, census, checks

Run these in order. Each depends on the one before.

1. `pnpm dm exec task -- build`: it installs every app from the new locks through `dm init`.
2. `pnpm dm exec task -- validate`:
   - `validate:rule-inventory` reads the **managed** eslint app. Its "up to date" means nothing
     until the eslint lock is regenerated.
   - When it reports drift, compare it with the plugins' own rule lists. Park new `error` rules as
     the hard rules say.
   - Watch for renamed rules. unicorn renames without saying so in its release notes; check a
     removed name against the new rule list.
   - `sonarjs` sometimes drops a rule from its preset; that shows up as error → off.
3. **The `KnownRuleName` deadlock.**
   - A name the census does not know yet fails `tsc`, and `task build` runs
     `tsc --emitDeclarationOnly`, so the build fails.
   - `rules:inventory` builds first, so it cannot regenerate the names while such an entry exists.
   - Order: run `pnpm dm exec task -- rules:inventory` once, with the new rules at their preset
     severity; then add the list entries; then run `rules:inventory` again.
   - Accepting the inventory is the user's decision, except under the parking policy above.
4. `pnpm --silent dm lint` over the whole repository. New rules and formatter releases show up here
   first.
5. `pnpm exec tsc --noEmit -p tsconfig.json`, and for wrapper dependencies also
   `tsc --emitDeclarationOnly`, which catches unnameable inferred types.
6. `pnpm test`.
7. `pnpm --silent dm install <changed apps>` and `pnpm dm exec <app> -- --version` for the moved
   apps. This installs from the new lock and is the real proof.
8. `pnpm dm exec task -- refresh`: build, docs, and every validator. It must end green, apart from
   the inventory gate while rule decisions are pending, which you say explicitly.

## Step 4 — upstream review with subagents

Launch parallel subagents grouped by concern, not one per package. These groupings worked:

- oxc: oxlint, oxfmt, eslint-plugin-oxlint, tsgolint;
- each big ESLint plugin with majors on its own;
- ESLint core with typescript-eslint and the react/next plugins;
- the small ESLint plugins together;
- knip;
- the text tools: cspell, prettier, markdownlint, commitlint, yaml, svelte;
- pnpm with the runtimes;
- the app groups: slidev/mmdc/playwright, security scanners, Go tools, Python tools;
- build tooling: tsdown, unrun, json2ts.

Every subagent prompt carries these rules, which subagents have broken when they were missing:

- Work only in a named scratch directory; clone there with `git clone --filter=blob:none`, and add
  `--no-checkout` for huge repos.
- Read files in the repository with cat/grep/sed, but run **no git command there, not even a
  read-only one**, create or change no file there, and run no pnpm, task or datamitsu command there.
- Read the release notes for every release in range and the full diff between the tags, and state
  the sizes.
- Judge everything against **how this repo uses the package**. Point the subagent at the files:
  - `src/datamitsu-config/tools.ts` operations and flags, `apps.ts` entries, managed configs;
  - `src/apps/<tool>/index.ts`, `src/lint-rules/*`;
  - and the AGENTS.md section that documents the tool, whose claims it must re-verify one by one.
- Report the breaking or behavior changes that touch our usage, the exact edits needed, and a
  verdict per package. Measure old against new where it is cheap to.

A subagent's report is input, not a decision. Verify anything surprising yourself before acting.
Relay the conclusions to the user; they do not see the report.

## Per-registry specifics

### uvVersions.json

- Since core aa52e62, uv locks record `exclude-newer-span = "P7D"`, so young transitive
  dependencies roll back.
- A PyPI tool that ships a Go or Rust binary still goes through uv.

### nodeVersions.json

- `pull:node` updates `package.json` through `scripts/sync-node-versions-to-package-json.ts`, but
  **not** the literal in the root `datamitsu.config.ts`. Copy every changed version, and
  `packageManager`, into the literal; `validate:pins` checks both.
- eslint and oxlint must stay one decision. Check whether a moved plugin changes which ESLint rules
  `eslint-plugin-oxlint` turns off, and whether oxlint added, removed or renamed a rule.
  `oxlint-known-rules.generated.ts` changes only by its header when oxlint added nothing.

### githubApps.json

- The user should pull with `GITHUB_TOKEN="$(gh auth token)"`: unauthenticated GitHub allows 60
  requests an hour.
- Core ≥ 0.4.0 retries, reports every failed app and exits 1. Older cores skipped apps silently.
- After the pull, check each of these:
  - **Apps without `binaries`**: an entry with no binaries is retried and never saved.
  - **Releases without asset digests**, roughly anything before mid-2025, cannot be pulled. The
    user writes these entries by hand: sha256 checked against the release checksums, and
    `configHash` is XXH3-128 of `owner\0repo\0tag`, big-endian hex, as in datamitsu's
    `internal/hashutil`.
  - **Wrong assets**:
    - a foreign OS (illumos, solaris, netbsd) mapped to linux;
    - an arch token that contradicts the platform key;
    - an installer (`*-setup.exe`) or a sibling program chosen instead of the app.
  - **Prerelease tags.** `--update` downgrades an app pinned to a semver prerelease: swag
    `v2.0.0-rc5` goes to `v1.16.6`. Put it back by hand until the core guards against it.
  - **A changed `binaryPath`** must be proven by running the binary. A `binaryPath` guessed after
    the history was wiped still resolves through suffix/basename matching, but not when the
    binary's name differs from the app's (golang-migrate ships `migrate`).
  - **An `exec format error` on this machine** can be a stale store entry, keyed by
    url + hash + binaryPath from an older core. Re-run against a clean `XDG_CACHE_HOME` before
    blaming the registry.
  - **The Alpine image**: a static binary with only glibc entries needs `forceInclude` in
    `scripts/generate-dockerfiles.ts`. A removed app can linger there and in the cspell words.
- Tools with no digests, or with one archive for every platform, can move to the Go runtime
  (`go: { packageName, version, lockFile }`; `env: { CGO_ENABLED: "0" }` when a dependency needs C
  headers; `versionCheck: { disabled: true }`, since source builds print `dev`).
- Tools that need files beside their binary (protoc's `include/`) get `extractDir: true` and an
  exact `binaryPath` set in `apps.ts` after the registry is loaded. `pull-github` writes neither.

### externalApps.json

- The pull is this repo's own `scripts/pull-external-apps.ts`. It honours
  `DATAMITSU_MIN_RELEASE_AGE` through each app's `githubRepo`, checks every asset against its
  `checksumUrlTemplate`, and without `--update` only verifies.
- helm's default Kubernetes version follows its client-go, so a minor can add `helm lint`
  warnings.

### runtimes.json

- **Node** feeds `runtimeVersions.node`, `.node-version` and `devEngines`.
- **Python** needs every uv lock regenerated.
- **pnpm** needs every bun and node lock regenerated, plus the `packageManager` pins.
- **JVM**: the core steps down to the previous Temurin release while the newest has no build past
  the window. Check the platform set of a new Java major: Temurin 27 has no macOS x64 build.

### The datamitsu core

`@datamitsu/datamitsu` in `package.json`.

- Edit the version and run `pnpm install`. `@datamitsu/*` is excluded from the minimum release
  age, and `prepare` runs the build that syncs every pin.
- A move from unstable to stable also moves `getMinVersion`, the parser OCI ref and the Docker
  base image.

### Wrapper-only dependencies

- These are the ones in `package.json` with no `packageName` in `nodeVersions.json`: commander,
  execa, tsx, type-fest, vitest, tsdown, unrun, json-schema-to-typescript, remove-markdown and
  `@types/*`. `pull:node` never touches them; upgrade them only when asked, within the minimum
  release age.
- Check `engines` against the consumer floor, `>=22.12.0`, for anything shipped in
  `dependencies`.
- `typescript` in the root stays on 6 while typescript-eslint's peer range excludes 7. The
  registry's `tsc` app can be on 7, because it only runs the binary.
- Snapshot `datamitsu.config.base.js`, `dist/` and `dist-inline-*` before a build-tool bump, and
  diff after. The goja-evaluated code must not change unexpectedly.

## Cross-tool consistency

Tools here hand work to each other, so a change in one silently changes another. Check every pair
a bump touches:

- **ESLint ↔ oxlint** through `eslint-plugin-oxlint`, one set of lists (`src/lint-rules/`), and
  `ESLINT_TO_OXLINT_RULE` for renamed rules. A rule oxlint stops checking in some file type is
  still off in ESLint there.
- **Formatters**: oxfmt owns JS/TS/JSON/CSS/Markdown; yamlfmt and sort-keys own YAML; prettier is
  skipped. A formatter release that reformats must not start a loop with another formatter.
- **Spelling**: cspell for the dictionary, typos for known misspellings.
- **Structure against layout**: markdownlint layout rules stay off because oxfmt owns layout.
  stylelint owns CSS, so unicorn's CSS rules and a stylelint preset must not both judge a file.
- **knip**: AGENTS.md documents many precise knip behaviors; a knip bump re-verifies each one.
- **Docker**: `forceInclude`, `ociExcludedApps` and Alpine (musl) viability of every added binary.
- **AGENTS.md**: correct every statement a new version made false, with the version it changed in.

## config reconcile

Only when the user allows it. It rewrites every managed file at once.

- Run it through `pnpm dm`, never `node bin/datamitsu.js`. The package script sets dev mode and
  `--binary-command`, and the base content depends on both, so a direct call reports false drift.
- Take a snapshot of every target first: the files listed by `--dry-run` and the output of
  `git diff`. Then run it with `--skip-fix`, diff every file against the snapshot, and only then
  let `dm fix` normalize.
- A refused run names an `expectChainHash` that moved. The incoming content includes the file on
  disk, so dependency bumps and reformatting move it too.
  - Before updating a pin, diff the printed incoming content against the file.
  - Explain every difference. The known ones: the base strips consumer-only dependencies from
    `package.json`, and it adds the package itself to the catalog.
- A managed file whose project-specific content is not written as an override in the root config
  (like `.markdownlint-cli2.mjs` and `droast.toml` are) gets overwritten. Move the content into the
  root config rather than restoring the file after every run.

## Report

- Write the working report to `registry-update-<registry>.md` at the repo root.
  `/registry-update-*.md` is in `.git/info/exclude`; add the pattern if it is missing. Offer to
  delete the file when the update is done.
- In chat, lead with the verdict: what is done, what is green, and what needs a decision.
  - Put the decisions as a numbered list with a recommendation each.
  - Give exact dates for anything waiting on the release-age window: when a fix clears, and when
    a temporary exclusion can go.
  - Add what changes for consumers, ready for the commit message.
  - Say what you did not check.

## Committing — only when asked

- The user may have staged files. Compare the index with the intended set right before
  `git commit`, and abort on a mismatch.
- The pre-commit hook regenerates and stages files from the working tree: the root literal,
  `website/reference/*`, the Dockerfiles. It also builds, validates and runs the tests.
- commitlint reads a body line that starts with a single word and a colon as a footer, and fails. Check the message
  with `pnpm dm exec commitlint -- --edit <file>` first.
- Commit messages explain why. Close with a `For consumers:` paragraph when behavior changes for
  them. PRs are squash-merged, so one accurate commit is fine.
- Do not push unless asked.
