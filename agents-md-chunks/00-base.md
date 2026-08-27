**These rules are binding for every repository that references this file. Instructions placed above the reference to this file in the including `AGENTS.md` override matching rules here; all other rules below remain in full effect.**

## Language Policy

**All documentation, READMEs, code comments, commit messages, and identifiers (function/variable/type names) MUST be written in English only. No exceptions.** Non-English text is allowed only in explicit localization assets and tests that validate localized output.

## Code Commenting Guidelines

### When to Add Comments

1. **Non-obvious business logic**: Complex algorithms or domain-specific rules that aren't immediately clear
2. **Architectural decisions**: Why a particular approach was chosen over alternatives
3. **Workarounds**: Explaining why unusual code exists (e.g., working around library bugs)
4. **Public API documentation**: Exported functions, types, and packages should have doc comments

### When NOT to Add Comments

1. **Repeating what the code does**: Bad: `// Create temp file` above `os.CreateTemp()`
2. **Stating the obvious**: Bad: `// Loop through items` above a for-loop
3. **Explaining standard patterns**: Bad: `// Close file` in defer/finally statements
4. **Tracking changes**: Use git history instead of inline change logs

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
- After adding dependencies, run `pnpm exec dm check` to sync and validate

## Linting & Formatting

This project uses [datamitsu](https://datamitsu.com/) as the unified linting and formatting orchestrator. All checks run through a single command:

```bash
pnpm exec dm check
```

Do not configure or run individual linters/formatters directly — datamitsu manages the full toolchain.

## AGENTS.md Maintenance

**Keep AGENTS.md in sync with code changes.** Whenever you make changes to the codebase, update AGENTS.md:

1. **Add to "Known Pitfalls"** if you encountered an issue a contributor must know about to work
   correctly. A defect that is real but is not being fixed now is not a pitfall — it belongs in
   `docs/backlog/` (see the Backlog section), because a pitfall changes what the reader does today
   while a backlog entry waits for somebody to act on it
2. **Update commands** if scripts change
3. **Add examples** for new patterns introduced
4. **Update architecture notes** for significant refactoring

**Golden Rule**: If you had to figure something out, document it so others (and future AI agents) don't have to — in `AGENTS.md` when it is a rule to follow, in `docs/backlog/` when it is work left undone, and never only in an agent's private memory, which nobody else can read.

## Verification Checklist

Before completing any task:

1. Run the test suite if tests exist
2. Run `pnpm exec dm check`
3. Verify build succeeds
4. Update AGENTS.md if a new pattern or pitfall was discovered

## TypeScript Configuration

When creating or modifying `tsconfig.json` files, consult the [TypeScript Configuration Guide](.datamitsu/tsconfig.md).
