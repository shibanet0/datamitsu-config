---
worth: later
where: src/datamitsu-config/globs.ts:28
added: 2026-09-24
---

# A repository-scoped tool re-runs after any edit, even to files it never reads

datamitsu keys a `unit`- or `repo`-granularity verdict on every tracked file under the unit —
`unitMembers` in datamitsu's `internal/tooling/verdict.go`, "deliberately wider than the operation's
globs" — and makes caching `repo` opt-in (`cache: true`) for exactly that reason. droast's verdict
depends only on Dockerfiles, compose and bake files, ignore files and `droast.toml`, which is what
`droastGlobs` lists, yet with `cache: true` it would still re-run after an edit to any `.ts` file.
It would be skipped only when nothing in the repository changed, which is rarely why anyone runs a
check.

The idea: let an operation declare that its `globs` are a closed world, and key the verdict on the
files they match (plus the guards) instead of on every member. droast would then run once per
Docker-related change rather than once per check. The key has to include the matched path list, not
only contents, so deleting `.dockerignore` still invalidates it — that is what rules out
`granularity: "file"` as a shortcut today: there, the remaining files all hit and the stale verdict
passes.

What is unknown is whether any tool's globs can honestly be declared closed. droast walks the tree
honoring `.gitignore`, so an untracked Dockerfile or an edited `.gitignore` changes what it lints
without touching a matched tracked file, and a compose `include:` or a bake file can name paths
outside the globs. It needs that audit per tool, and the feature belongs in datamitsu core, not in
this configuration. It becomes worth deciding if a second slow repository-scoped tool shows up, or
if [droast-lint-takes-seconds-on-every-check](droast-lint-takes-seconds-on-every-check.md) cannot be
undone.
