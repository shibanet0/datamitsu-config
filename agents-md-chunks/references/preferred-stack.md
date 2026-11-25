# Preferred Stack Catalogue

## Web

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

## Node

- Web framework: Fastify.
- Schemas/validation: `typebox` — the npm package `typebox` (<https://www.npmjs.com/package/typebox>), NOT `@sinclair/typebox`.
- Database: Kysely, a type-safe query builder (<https://kysely.dev>).
- CLI: commander with `@commander-js/extra-typings`.

## Go

- HTTP router: `github.com/go-chi/chi/v5`.
- Logging: `go.uber.org/zap`.
- CLI: `github.com/spf13/cobra`.
- Database: sqlc — generate type-safe Go query functions from plain SQL. Pairs with goose for migrations. Run via `pnpm dm exec sqlc -- generate`.
- Dev/tooling: air (live reload), swag (Swagger), goose (DB migrations) — run via `pnpm dm exec`.

## Testing

- Unit: Vitest.
- E2E: Testcontainers (<https://testcontainers.com>); browser E2E → Playwright (<https://playwright.dev>).

## Docs

- Documents: Typst. Presentations: Slidev. Run both via `pnpm dm exec`.
