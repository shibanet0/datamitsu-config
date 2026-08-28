## Dependabot (public GitHub repos only)

Keep `.github/dependabot.yml` accurate **only when this is a public GitHub repository**. Confirm before acting — e.g. `gh repo view --json visibility,isPrivate`. If the repo is private, not on GitHub, or you cannot determine this, **do nothing** and leave the file absent.

When it is a public GitHub repo:

1. **Ensure the file exists** if the repo has any supported ecosystem (npm/pnpm, Go modules, pip/uv, Cargo, Terraform, Docker, GitHub Actions). A minimal `version: 2` file with an empty `updates:` list is enough to opt in — `dm setup` fills in the rest.
2. **Own the `updates` entries** (the "what"): the `package-ecosystem` values and their `directory`/`directories`. Keep these in sync with the project's real layout — add an entry when a new workspace/service/ecosystem appears, remove one when it goes away.
3. **Do NOT hand-tune policy fields.** `commit-message`, `versioning-strategy`, `schedule`, `groups`, and `open-pull-requests-limit` are owned by datamitsu and are normalized on every `dm setup` (conventional-commit prefixes such as `chore(deps):`, weekly cadence, grouped PRs). Editing them by hand is pointless — they will be overwritten.
4. **Run `pnpm dm setup` after editing** so datamitsu re-applies the managed policy. datamitsu never creates this file on its own; it only normalizes one that already exists.
