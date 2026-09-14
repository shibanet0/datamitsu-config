<!-- cspell:ignore gitdir -->

# Lefthook Proxy

The `lefthook` app in this configuration is **not** the upstream Lefthook binary. It is a small Datamitsu-owned wrapper running on managed Bun that isolates the working tree, runs upstream Lefthook against that isolated state, and puts the working tree back. Upstream Lefthook is still installed — under the private name `dm-internal-lefthook-upstream` — and the proxy does nothing but forward to it for every command that has no isolation policy.

## Why

A pre-commit hook should check what you are about to commit, not what happens to be lying around in your working tree. Without isolation a linter sees unstaged edits and untracked scratch files, so hooks fail on code that is not part of the commit — and formatters with `stage_fixed: true` can stage lines you never staged yourself.

## What it does

| Hook            | What upstream Lefthook sees                  | What is hidden                          |
| --------------- | -------------------------------------------- | --------------------------------------- |
| `pre-commit`    | the index snapshot — exactly what you staged | unstaged changes, untracked files       |
| `pre-push`      | a clean `HEAD`                               | staged, unstaged, and untracked changes |
| everything else | your real working tree — no isolation at all | nothing                                 |

Hidden state is parked in a private transaction stash (`refs/stash`, message `datamitsu-lefthook-proxy-<worktree>-<uuid>`) and restored after Lefthook exits. Branch history is never rewritten.

Formatter output survives: `pre-commit` stashes with `--keep-index`, so anything a hook stages with `git add` stays staged, while the pre-hook working-tree copy of the same file is restored on top.

Nested invocations are transparent. The proxy sets `DATAMITSU_LEFTHOOK_PROXY_ACTIVE=1` for the child, and a proxy that sees it forwards without opening a second transaction.

## When isolation is skipped

Isolation is skipped — with a message on stderr, never silently — when it cannot be done safely:

- **Git holds a temporary staging index.** `git commit -a` commits through `<gitdir>/index.lock` and `git commit -- <path>` through `<gitdir>/next-index-<pid>.lock`. Git owns those locks for the duration of the commit, so stashing under them would fight Git for the index. **Hooks therefore see your whole working tree for these two commands.** Use a plain `git commit` over a staged index if you want the isolation guarantee.
- **An alternate `GIT_INDEX_FILE` is set** by some other tool.
- **A merge, rebase, cherry-pick, revert or sequencer operation is in progress** — the repository already holds state that a stash would disturb.
- **The repository has no `HEAD` yet** (the initial commit); `git stash` requires one.

## Exit codes

On top of whatever upstream Lefthook returns:

| Code                  | Meaning                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `70`                  | the working tree could not be isolated or restored — the backup is kept and recovery commands are printed |
| `71`                  | the working tree is fine, but the installed Git hooks could not be re-pointed at the proxy                |
| `127`                 | upstream Lefthook could not be found or executed                                                          |
| `129` / `130` / `143` | terminated by `SIGHUP` / `SIGINT` / `SIGTERM`; the working tree is restored first                         |

## Recovery

The proxy relays `SIGHUP`, `SIGINT` and `SIGTERM`, so closing the terminal or pressing ++ctrl+c++ still restores the tree. A `SIGKILL` (or a power cut) cannot be caught: the transaction stash is left behind, and **the next hook run in that worktree refuses to start** rather than burying your changes under a second stash. The message names the backup:

```console
lefthook proxy: cannot isolate the working tree: unfinished transaction backup 6f1c…
```

Confirm no hook process is still running, then restore it:

```bash
git stash list --format='%H %gs' --grep=datamitsu-lefthook-proxy
git stash show --stat <oid>      # inspect first
git stash apply --index <oid>    # restores both index and working tree
git stash drop <selector>        # only after verifying the result
```

Backups are scoped per worktree, so a crashed run in one linked worktree does not block commits in another.

## Installation verification

The proxy declares `dependsOn: ["dm-internal-lefthook-upstream"]`. Datamitsu provisions
that dependency when installing, executing, seeding, or repairing the proxy, including
in Docker app slices. Neither app needs `required: true`.

When `lefthook.yaml` exists, every `datamitsu init` runs `lefthook install --force`
through the managed app executor. This provisions both apps and rebinds installed hooks
to the currently resolved paths, even if the apps were already installed. Init does not
create the managed `lefthook.yaml`; projects must create it before hooks can be installed.

`lefthook --proxy-version` verifies the wrapper's package version independently of upstream
resolution. Datamitsu uses this for the proxy's installation check. `lefthook version` and
`lefthook --version` execute upstream; the final image's offline smoke test checks both apps together.

## Environment variables

| Variable                          | Purpose                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `DATAMITSU_LEFTHOOK_UPSTREAM`     | exact executable path to the private upstream binary, supplied by datamitsu runtimeEnv |
| `DATAMITSU_LEFTHOOK_PROXY_ACTIVE` | set to `1` for the child process; suppresses nested isolation. Do not set by hand      |
| `LEFTHOOK_BIN`                    | standard Lefthook variable; the proxy writes its own path here in installed hooks      |

`lefthook install` additionally rewrites each installed hook to call the public proxy and to pin the upstream path and managed Bun directory, so hooks keep working without a system Bun installation or the store on `PATH`. The hook also sets `BUN_OPTIONS` to disable project Bun configuration, automatic environment-file loading, and automatic package installation. Running `lefthook --help` prints a summary of all of the above.

Datamitsu resolves `${APP_BIN:dm-internal-lefthook-upstream}` into the execution-only
`DATAMITSU_LEFTHOOK_UPSTREAM` value. The proxy uses that exact executable and rejects a path
that is missing, not executable, or points back to itself. An invalid binding fails with
exit code `127` rather than silently switching upstream versions. Only when the variable
is unset does the proxy look for `dm-internal-lefthook-upstream` on `PATH`.

Run standalone commands with `datamitsu exec lefthook -- <args>` or an activated source
farm. Git starts installed hooks outside datamitsu, so hooks retain the exact upstream
path captured during installation. After a config upgrade or store cleanup, run
`datamitsu init` to provision the current apps and rebind those paths. Until then a hook
can retain an older executable, or fail if that executable was removed; the error points
to these recovery commands.
