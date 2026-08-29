**These rules are binding for every repository that references this file. Instructions placed above the reference to this file in the including `AGENTS.md` override matching rules here; all other rules below remain in full effect.**

## Language Policy

**All documentation, READMEs, code comments, commit messages, and identifiers (function/variable/type names) MUST be written in English only. No exceptions.** Non-English text is allowed only in explicit localization assets and tests that validate localized output.

## Code Commenting Guidelines

**Default to no comment.** Code that needs prose to be understood should be rewritten first — a clearer name, a smaller function, an extracted constant. A comment is the fallback for what genuinely cannot live in the code; it is never a way to describe code you just wrote.

Write one ONLY in these cases:

- **Non-obvious business logic** — a domain rule or algorithm whose _why_ is not derivable from the code.
- **Architectural decisions** — why this approach, and over which specific alternative.
- **Workarounds** — name the bug, version, or constraint that forces the unusual shape.
- **Doc comments the language requires** — Go exported identifiers and packages (the shipped `revive` config enables `exported` and `package-comments`). Such a comment MUST say something the signature does not. `// Foo does Foo` satisfies the linter and is forbidden anyway, like any other restatement.

**Everything else is forbidden.** Never write a comment that:

- restates what the code does, in any form;
- states the obvious, labels a standard pattern (`defer`/`finally` cleanup, a loop, a getter), or captions a section of a function body;
- narrates the edit — what changed, what it used to be, what you decided while writing it. That belongs in the commit message and git history;
- repeats the signature: parameter names, types, or the return value.

**The test:** say what the comment adds that the line below it does not. If you cannot, delete it rather than reword it. Apply this to comments you are about to write, and to existing ones in code you are already changing.

## Testing

- All tests MUST be isolated — never modify workspace root or shared state
- Each package/module must be independently testable
- Clean test artifacts in teardown hooks (`afterEach` / `afterAll` / `t.Cleanup`)
- Mock external dependencies to prevent network calls or file system mutations outside test scope
- Never commit `.only`, `.skip`, or equivalent markers in test files

## Git Workflow

Follow GitHub Flow with feature branches from main.

**Never bypass commit hooks or verification — under any circumstances.** Do not pass `--no-verify` (or any equivalent skip flag) to `git commit`/`git push`, and never disable, uninstall, or work around pre-commit, commit-msg, or pre-push hooks. They run the same checks as CI; skipping them only pushes a known breakage downstream and burns the maintainer's time.

- A failing hook is a real signal, not an obstacle to route around. Fix the root cause — the code, the commit contents, or the local environment (e.g. a broken toolchain/store) — then commit again.
- **Commits must stay signed.** If commit signing is configured and signing fails (e.g. a passphrase-locked SSH key that is not loaded in the agent), STOP. Do not commit unsigned, and do not disable signing to get around it. Tell the user their commit signing needs attention and ask them to make it work so you can commit.
- If you cannot commit cleanly, stop and report exactly why. Never trade a clean history or a green CI for a shortcut that only looks green.

### Worktrees

Worktrees are managed with `wt`, which datamitsu installs. Never run `git worktree add`/`remove` by hand, and never install `wt` separately — no `brew`, no `cargo`, no `curl | sh`.

| Task                            | Command                                       |
| ------------------------------- | --------------------------------------------- |
| Create a worktree and a branch  | `pnpm dm exec wt -- switch --create <branch>` |
| List worktrees with their state | `pnpm dm exec wt -- list`                     |
| Land the branch and clean up    | `pnpm dm exec wt -- merge`                    |
| Drop a worktree and its branch  | `pnpm dm exec wt -- remove <branch>`          |

`wt switch` changes the directory through shell integration, which a child process cannot do. An agent asks for the path instead and moves itself:

```bash
pnpm dm exec wt -- switch --create <branch> --no-cd --format=json
```

Activity markers in `wt list`, and routing of a harness's own worktree creation through `wt`, come from an optional plugin that datamitsu does not install. Suggest `wt config plugins <claude|codex|opencode> install` to the user instead of running it yourself — it writes to their machine-wide harness config, not to this repository.

**Commit message format** (Conventional Commits):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` code restructuring (no behavior change)
- `test:` adding or updating tests
- `chore:` maintenance, dependency updates

## Dependency Management

- **Internal packages**: Always use workspace protocol references (`workspace:*`)
- **Peer dependencies**: Use caret ranges (`^`) for compatibility
- **Regular dependencies**: Pin exact versions for reproducibility
- After adding dependencies, run `pnpm dm check` to sync and validate

## Linting & Formatting

All linting and formatting runs through [datamitsu](https://datamitsu.com/) via one command: `pnpm dm check`. Do not configure or run individual linters/formatters directly — datamitsu manages the full toolchain.

## AGENTS.md Maintenance

**Keep AGENTS.md in sync with code changes.** Whenever you make changes to the codebase, update AGENTS.md:

1. **Add to "Known Pitfalls"** if you encountered an issue a contributor must know about to work
   correctly today. A real defect that nobody is fixing now is not a pitfall — it belongs in
   `docs/backlog/` (see the Backlog section)
2. **Update commands** if scripts change
3. **Add examples** for new patterns introduced
4. **Update architecture notes** for significant refactoring

**Golden Rule**: If you had to figure something out, document it so others (and future AI agents) don't have to — routed per the Backlog section, and never only in an agent's private memory.

## Verification Checklist

Before completing any task:

1. Run the test suite if tests exist
2. Run `pnpm dm check`
3. Verify build succeeds
4. Update AGENTS.md if a new pattern or pitfall was discovered

## TypeScript Configuration

When creating or modifying `tsconfig.json` files, consult the [TypeScript Configuration Guide](.datamitsu/tsconfig.md).
