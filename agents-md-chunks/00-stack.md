## Preferred Stack

When creating projects or apps, or adding dependencies, choose from this catalogue first. Do not invent alternatives or use unmaintained/EOL packages. This is a priority list, not a mandate: keep a reasonable existing choice.

### Version Policy

- If the library is already used in the repo, match that exact version.
- If it is not present, check the CURRENT latest stable release before adding. Never pick a stale major from memory — verify the version resolves first.
- Prefer runtimes and tools managed by `datamitsu`; do not hand-install what `dm` already provides.

### Invocation

Use `pnpm dm <command>` in a pnpm monorepo wired with this config (e.g. `pnpm dm check`, `pnpm dm config reconcile`, `pnpm dm exec <tool>` such as `pnpm dm exec air`, `pnpm dm exec goose`, or `pnpm dm exec task -- <task>`). Without an initialized pnpm stack, use the system-installed `datamitsu` binary (`datamitsu check`, `datamitsu config reconcile`, `datamitsu exec <tool>`).
For a new monorepo subproject, the shipped hook runs `<invocation> config reconcile --create-missing`, creating only missing managed configs and never touching existing files. Run it manually after adding a subproject to avoid waiting for the next commit.

### Web

- App: Vite + React + TypeScript, with the React Compiler enabled.
- Data fetching: SWR.
- Routing: react-router with `@ovineko/react-router` — a type-safe React Router v7 wrapper (valibot-validated params, typed routes, automatic error handling).
- SPA resilience: `@ovineko/spa-guard` — a top-level guard for single-page apps that recovers from chunk-load failures after deploys (cache-busting + automatic retry), plus version checking and error reporting. Wire it via `@ovineko/spa-guard-react` (hooks + error boundaries) and the `@ovineko/spa-guard-vite` plugin; server side via `@ovineko/spa-guard-fastify` / `-node`.
- UI kit: admin panels → Ant Design; user-facing products → Mantine.
- Styling: vanilla-extract (Mantine ships a vanilla-extract integration).
- i18n: i18next.
- Component catalogue: Storybook.
- Emails: react-email. PDF: `@react-pdf/renderer` to generate, `react-pdf` to view.
- Prefer the ovineko ecosystem — consult <https://ovineko.com/llms.txt> first.
- **Banned: Tailwind CSS and anything built on top of it. Never introduce it.**

### Node

- Web framework: Fastify.
- Schemas/validation: `typebox` — the npm package `typebox` (<https://www.npmjs.com/package/typebox>), NOT `@sinclair/typebox`.
- Database: Kysely, a type-safe query builder (<https://kysely.dev>). Do NOT use TypeORM or any ORM — Kysely is a query builder, not an ORM.
- CLI: commander with `@commander-js/extra-typings`.

### Go

- HTTP router: `github.com/go-chi/chi/v5`.
- Logging: `go.uber.org/zap`.
- CLI: `github.com/spf13/cobra`.
- Database: sqlc — generate type-safe Go query functions from plain SQL. Pairs with goose for migrations. Run via `pnpm dm exec sqlc -- generate`.
- Dev/tooling: air (live reload), swag (Swagger), goose (DB migrations) — run via `pnpm dm exec`.

### Security & Hashing

- Password hashing: argon2id. Never bcrypt, plain SHA, or MD5 for passwords.
- Non-cryptographic hashing (cache keys, fingerprints, non-adversarial): consider `github.com/zeebo/xxh3` — fast. Never use it to verify external content; use a cryptographic hash (SHA-256 or stronger) there.

### Testing

- Unit: Vitest.
- E2E: Testcontainers (<https://testcontainers.com>); browser E2E → Playwright (<https://playwright.dev>).

### Monorepo

- Turborepo + pnpm workspace. Every package — including Go and Rust — carries a `package.json` so `turbo run <script>` orchestrates builds in dependency order.
- Script names follow the Project Scripts policy, including documented extensions and tool-required names. Turbo owns cross-package dependencies; Taskfile owns package-local steps, invoked via `pnpm dm exec task -- <task>`. Do not duplicate Turbo's package graph in Taskfile.

### Docs

- Documents: Typst. Presentations: Slidev. Run both via `pnpm dm exec`.
