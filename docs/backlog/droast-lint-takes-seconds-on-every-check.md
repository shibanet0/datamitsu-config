---
worth: yes
where: src/datamitsu-config/tools.ts:390
added: 2026-09-24
---

# droast takes seconds on every check, so it lints only in CI and does not fix

Since droast 1.5.0 a large Dockerfile costs it ~1.5s. This repository's two generated Dockerfiles
(33 KB and 30 KB, ~100 `RUN`s each) put it at 3.7s in `dm lint` and 6s in `dm fix` on every full
check, because a repository-granularity operation is not cached by default, and `cache: true` would
key on every tracked file (see
[repository-scoped-tools-rerun-after-any-edit](repository-scoped-tools-rerun-after-any-edit.md)).
So the lint runs under `skip: !isCI` — locally `CI=true dm lint --tools droast` — and there is no
fix operation. The cost: DF076, DF078, DF079 and DF083, which the fix used to settle silently, now
surface as CI failures, to be applied by hand with `dm exec droast -- -c <droast.toml> --fix .`;
and locally a Dockerfile gets hadolint only, without droast's own rules — the build-context checks
(DF033, DF077) and the suppression policy in `droast.toml`.

The cause is upstream. 1.5.0 (d6afa09) took `src/rules.rs` from 14 to 47 `Regex::new` calls, none
cached; four helpers compile theirs per call, per `RUN`, per rule, and DF060 and DF066 call one of
them for ~25 command names each. Memoizing `Regex::new` in a scratch build took a whole-repository
lint from 4.1s to 0.86s with `--shellcheck required` and 62ms without, output identical; the
remainder is one ShellCheck process per `RUN`. No upstream issue exists as of 1.7.0, and filing one
is what unblocks this. Pinning back to 1.4.12 (20ms on the same file) is not an option: it has
neither `-c`, through which datamitsu hands droast its managed config, nor `--fix`.

A fix operation run before upstream is fast has constraints worth knowing. droast's `--fix` lints
every file with every rule before and again after applying. Restricting it with `--only <fixers>`
is fast (18ms) but silently overrides `categories`, `skip-categories` and `preset` from
`droast.toml`; `--skip <every other rule>` respects them (28ms) but needs the full rule list kept in
step with each droast release. The fixer IDs appear only in the error droast prints for
`--fix=<non-fixer>`. Fix and lint under different `skip` values would need two tools, because
`skip` is one boolean per tool.
