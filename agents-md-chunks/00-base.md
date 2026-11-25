**These rules bind every repository referencing this file. Instructions above the reference in the including `AGENTS.md` override matching rules; all others below remain in full effect.**

## Language Policy

Write documentation, code comments, and commit messages in English unless explicitly instructed otherwise. This does not set the user conversation's language.

Use clear, concise technical English guided by ASD-STE100: prefer short sentences, familiar words, active voice, and direct instructions where appropriate. Accuracy and completeness take priority over simplicity. Preserve precise technical terms, conditions, and normative requirements. Formal ASD-STE100 compliance is not required.

Keep new function, variable, and type names in English. Preserve existing identifiers, API names, commands, quoted text, and explicit localization assets or tests. Explicit requests for another language or style take precedence.

## Code Commenting Guidelines

**Default to no comment.** First clarify code that needs prose with better names, smaller functions, or extracted constants. Comment only as a fallback for what genuinely cannot live in code; never describe code you just wrote.

Write comments ONLY for:

- **Non-obvious business logic** — domain rules or algorithms whose _why_ code cannot show.
- **Architectural decisions** — why this approach instead of a specific alternative.
- **Workarounds** — the bug, version, or constraint requiring the unusual shape.
- **Required doc comments** — Go exported identifiers and packages (the shipped `revive` config enables `exported` and `package-comments`). Such comments MUST add information beyond the signature. `// Foo does Foo` may satisfy the linter, but is forbidden restatement.

**All other comments are forbidden.** Never:

- restate what code does;
- state the obvious, label a standard pattern (`defer`/`finally` cleanup, a loop, a getter), or caption a function-body section;
- narrate edits, former behavior, or writing decisions. Put that in the commit message and git history;
- repeat the signature's parameter names, types, or return value.

**Test:** State what the comment adds beyond the line below. If you cannot, delete it. Apply this test to new comments and existing ones in code you change.

## Testing

- All tests MUST be isolated — never modify workspace root or shared state
- Each package/module must be independently testable
- Clean test artifacts in teardown hooks (`afterEach` / `afterAll` / `t.Cleanup`)
- Mock external dependencies to prevent network calls or file system mutations outside test scope
- Never commit `.only`, `.skip`, or equivalent markers in test files

## Git Workflow

Follow GitHub Flow with feature branches from main.

**Never bypass commit hooks or verification.** Do not pass `--no-verify` or an equivalent skip flag to `git commit`/`git push`, or disable, uninstall, or work around pre-commit, commit-msg, or pre-push hooks. They run CI's checks; skipping them pushes known breakage downstream and wastes maintainer time.

- A failing hook is a real signal. Fix the root cause — code, commit contents, or local environment (e.g. broken toolchain/store) — then commit again.
- **Commits must stay signed.** If configured signing fails (e.g. a passphrase-locked SSH key is not loaded in the agent), STOP. Do not commit unsigned or disable signing. Tell the user signing needs attention and ask them to restore it.
- If you cannot commit cleanly, stop and report why. Never trade clean history or green CI for a shortcut that only looks green.

### Worktrees

Worktrees are managed with `wt`, installed by datamitsu. Never run `git worktree add`/`remove` manually or install `wt` separately (no `brew`, `cargo`, or `curl | sh`).

| Task                            | Command                                       |
| ------------------------------- | --------------------------------------------- |
| Create a worktree and a branch  | `pnpm dm exec wt -- switch --create <branch>` |
| List worktrees with their state | `pnpm dm exec wt -- list`                     |
| Land the branch and clean up    | `pnpm dm exec wt -- merge`                    |
| Drop a worktree and its branch  | `pnpm dm exec wt -- remove <branch>`          |

`wt switch` changes directories through shell integration, which child processes cannot do. Ask for the path, then move there:

```bash
pnpm dm exec wt -- switch --create <branch> --no-cd --format=json
```

Activity markers in `wt list` and routing harness-created worktrees through `wt` require an optional plugin that datamitsu does not install. Suggest `wt config plugins <claude|codex|opencode|pi|omp> install`; do not run it because it writes to the user's machine-wide harness config, not this repository.

**Commit message format** (Conventional Commits):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` code restructuring (no behavior change)
- `test:` adding or updating tests
- `chore:` maintenance, dependency updates

Use `<type>[optional scope][optional !]: <description>`, with a space after the colon. Keep the description concise; put details and rationale in the body. No hard header-length limit applies. Natural capitalization, acronyms, and exact identifier spelling are allowed; keep the type lowercase.

## Dependency Management

- **Internal packages**: Always use workspace protocol references (`workspace:*`)
- **Peer dependencies**: Use caret ranges (`^`) for compatibility
- **Regular dependencies**: Pin exact versions for reproducibility
- After adding dependencies, run `pnpm dm check` to sync and validate

## Linting & Formatting

All linting and formatting runs through [datamitsu](https://datamitsu.com/) via one command: `pnpm dm check`. Do not configure or run individual linters/formatters directly — datamitsu manages the full toolchain.

## AGENTS.md Maintenance

**Keep AGENTS.md in sync with code changes.** Update it whenever code changes:

1. Add to "Known Pitfalls" any issue contributors must know to work correctly today. A real defect nobody is fixing now belongs in `docs/backlog/` (see Backlog).
2. Update commands when scripts change.
3. Add examples for new patterns.
4. Update architecture notes for significant refactoring.

**Golden Rule:** Document what you had to figure out so others (including future AI agents) need not repeat it. Route it per Backlog; never leave it only in agent-private memory.

## Verification Checklist

Before completing any task:

1. Run the test suite if tests exist.
2. Run `pnpm dm check`.
3. Verify the build succeeds.
4. Update AGENTS.md if you discovered a new pattern or pitfall.

## TypeScript Configuration

When creating or modifying `tsconfig.json` files, consult the [TypeScript Configuration Guide](.datamitsu/tsconfig.md).
