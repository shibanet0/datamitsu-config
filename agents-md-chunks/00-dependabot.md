## Dependabot (public GitHub repos only)

Maintain `.github/dependabot.yml` only in public GitHub repos. Confirm visibility first (e.g. `gh repo view --json visibility,isPrivate`); if private, not on GitHub, or unknown, do nothing and leave the file absent.

For a public GitHub repo:

1. **Ensure the file exists** if any supported ecosystem is present (npm/pnpm, Go modules, pip/uv, Cargo, Terraform, Docker, GitHub Actions). A minimal `version: 2` with empty `updates:` opts in; `dm config reconcile` fills in the rest.
2. **Own `updates` entries**: keep `package-ecosystem` values and `directory`/`directories` aligned with the project layout, adding entries for new workspaces/services/ecosystems and removing obsolete ones.
3. **Do NOT hand-tune policy fields.** datamitsu owns and normalizes `commit-message`, `versioning-strategy`, `schedule`, `groups`, and `open-pull-requests-limit` on every `dm config reconcile` (including conventional-commit prefixes such as `chore(deps):`, weekly cadence, and grouped PRs); manual edits are overwritten.
4. **Run `pnpm dm config reconcile` after editing.** datamitsu only normalizes an existing file; it never creates one.
