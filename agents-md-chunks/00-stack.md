## Preferred Stack

When creating projects or apps, or adding dependencies, read the preferred stack catalogue at [preferred stack catalogue]({{preferredStackProjectPath}}) from the project root and choose from it first. Do not invent alternatives or use unmaintained/EOL packages. Keep a reasonable existing choice; the catalogue is not a migration mandate.

### Version Policy

- If the library is already used in the repo, match that exact version.
- If it is not present, check the CURRENT latest stable release before adding. Never pick a stale major from memory — verify the version resolves first.
- Prefer runtimes and tools managed by `datamitsu`; do not hand-install what `dm` already provides.

### Invocation

Use `pnpm dm <command>` in a pnpm monorepo wired with this config (e.g. `pnpm dm check`, `pnpm dm config reconcile`, `pnpm dm exec <tool>` such as `pnpm dm exec air`, `pnpm dm exec goose`, or `pnpm dm exec task -- <task>`). Without an initialized pnpm stack, use the system-installed `datamitsu` binary (`datamitsu check`, `datamitsu config reconcile`, `datamitsu exec <tool>`).
For a new monorepo subproject, the shipped hook runs `<invocation> config reconcile --create-missing`, creating only missing managed configs and never touching existing files. Run it manually after adding a subproject to avoid waiting for the next commit.

Never introduce Tailwind CSS or anything built on it. In Node projects, do not use TypeORM or any other ORM.

### Security & Hashing

- Password hashing: argon2id. Never bcrypt, plain SHA, or MD5 for passwords.
- Non-cryptographic hashing (cache keys, fingerprints, non-adversarial): consider `github.com/zeebo/xxh3` — fast. Never use it to verify external content; use a cryptographic hash (SHA-256 or stronger) there.

### Monorepo

- Turborepo + pnpm workspace. Every package — including Go and Rust — carries a `package.json` so `turbo run <script>` orchestrates builds in dependency order.
- Script names follow the Project Scripts policy, including documented extensions and tool-required names. Turbo owns cross-package dependencies; Taskfile owns package-local steps, invoked via `pnpm dm exec task -- <task>`. Do not duplicate Turbo's package graph in Taskfile.
