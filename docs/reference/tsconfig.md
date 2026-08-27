# TypeScript Configuration Guide

This package provides reusable TypeScript configurations for different project types.

## Requirements

- **TypeScript 6.0+** required. Every preset is also valid under TypeScript 7 — see
  [TypeScript 7](#typescript-7) before upgrading, as the compiler is stricter than 6.
- Modern bundler (tsup, vite, esbuild)

## Quick Selection

| Project Type              | Monorepo? | Config                        |
| ------------------------- | --------- | ----------------------------- |
| Next.js app               | Any       | `nextjs.json`                 |
| React + Vite app          | Any       | `base.json`                   |
| React library             | Yes       | `shared-react-library.json`   |
| React library             | No        | `react-library.json`          |
| Node.js library           | Yes       | `shared-library.json`         |
| Node.js library           | No        | `library.json`                |
| Backend service (Node.js) | Any       | `service.json`                |
| Backend service (Workers) | Any       | `service-worker.json`         |
| Pulumi / IaC              | Any       | `infra-pulumi.json`           |
| Node.js CLI               | Any       | `base.json` or `service.json` |
| E2E tests                 | Any       | `base.json`                   |

## Configuration Descriptions

### `base.json`

**For:** CLI tools, tests, build scripts, React apps (Vite, CRA)

**Features:**

- Strict typing by default
- `src/` → `dist/` structure
- Explicit configuration (all options specified)

**Example:**

```json
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/base.json"
}
```

---

### `library.json`

**For:** Standalone npm package (NOT in monorepo)

**Adds:** `noEmit: true` - bundler handles all output

**Example:** Standalone npm utility package

---

### `react-library.json`

**For:** Standalone React library (NOT in monorepo)

**Adds:**

- DOM types
- JSX support
- `noEmit: true`

**⚠️ WARNING:** DO NOT use for Node.js projects! Adds DOM types that don't exist in Node.js.

---

### `service.json`

**For:** Backend APIs, serverless functions, microservices — running on **Node.js**

**Adds:**

- `types: ["node"]`
- `noEmit: true`

**Example:** Express API, AWS Lambda

**Note:** For the Cloudflare Workers runtime use `service-worker.json` instead — it swaps Node types for Workers types.

---

### `service-worker.json`

**For:** Backend services on the **Cloudflare Workers** runtime

**Adds:**

- `types: ["@cloudflare/workers-types"]`
- `noEmit: true`

**Note:** Add `@cloudflare/workers-types` as a dev dependency. For Node.js services use `service.json`.

---

### `shared-library.json`

**For:** Library INSIDE a monorepo

**Adds:**

- `composite: true` - project references
- `declaration: true` - emits .d.ts
- `declarationMap: true`

**Why NOT noEmit:** Project references require TypeScript to emit declarations for IDE "go to definition".

---

### `shared-react-library.json`

**For:** React library INSIDE a monorepo

**Adds:**

- DOM types + JSX
- `composite: true`
- Declaration emit

---

### `nextjs.json`

**For:** Next.js apps (Pages/App Router)

**Features:**

- `jsx: "preserve"` - Next.js transforms itself
- `noEmit: true`
- Next.js plugin

---

### `infra-pulumi.json`

**For:** [Pulumi](https://www.pulumi.com/) Infrastructure-as-Code projects

**Standalone preset** — does **NOT** extend `base.json`. Pulumi runs TypeScript through its own ts-node runtime (full transpile), which is incompatible with the base preset's `verbatimModuleSyntax`, `module: "preserve"`, and erasable-only constraints.

**Adds / differs:**

- `experimentalDecorators: true` — Pulumi component resources use decorators
- `module: "esnext"`, `sourceMap: true`, `noEmit: true`
- `types: ["node"]`
- `allowImportingTsExtensions: true` — import sibling modules with an explicit `.ts`

**⚠️ The erasable-only rule does NOT apply here.** Because Pulumi _compiles_ the code (rather than stripping types), non-erasable syntax (`enum`, decorators, etc.) is legal in Pulumi code — and **only** in Pulumi code. Every other preset in this family forbids it.

---

## Common Mistakes

### ❌ react-library for Node.js projects

```json
// WRONG for Node.js API
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/react-library.json"
}
```

**Problem:** Adds DOM types (`document`, `window`) to Node.js environment.

**Solution:** Use `service.json`

---

### ❌ library instead of shared-library in monorepo

```json
// WRONG in monorepo
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/library.json"
}
```

**Problem:** `noEmit: true` disables declaration emit, IDE can't "go to definition".

**Solution:** Use `shared-library.json`

---

### ❌ Forgot explicit types after TS6

**Problem:**

```typescript
import { readFile } from "node:fs/promises";
// Error: Cannot find module 'node:fs/promises'
```

**Solution:**

```json
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/service.json",
  "compilerOptions": {
    "types": ["node"]
  }
}
```

---

## Path Aliases

**These configurations DO NOT include path aliases (`~/*`, `@/*`).**

**Why?**

- Require duplication in tsconfig, bundler, jest, eslint
- Problems when publishing libraries
- Different syntax across tools

**Use relative paths:**

```typescript
import { helper } from "../../utils/helper";
```

**Benefits:**

- Work everywhere without configuration
- ES modules standard
- IDE auto-updates

---

## Philosophy

**Bundler-centric approach:**

- TypeScript only for type checking
- Bundler handles compilation, sourcemaps, declarations
- Exception: monorepo `shared-*` configs emit declarations for project references

**Explicit configuration:**

- All options specified explicitly, even if they're TS6 defaults
- No magic, maximum compatibility
- "Just works" everywhere

---

## Migration to TS6

**TypeScript 6.0+ required:**

```bash
pnpm add -D typescript@^6
```

Pin the major deliberately — `typescript@latest` now resolves to 7.x, which is a
different compiler. See [TypeScript 7](#typescript-7).

**Add explicit types:**

```json
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/service.json",
  "compilerOptions": {
    "types": ["node"]
  }
}
```

**Check types:**

```bash
tsc --noEmit
```

---

## TypeScript 7

TypeScript 7 is the compiler rewritten in Go — what used to ship separately as
`@typescript/native-preview` (`tsgo`). It is now the `typescript` package itself, so a
separate native-preview dependency is redundant and should be removed.

Every preset here is valid under 7 — the `compilerOptions` surface is unchanged. Two
things are not:

**The JavaScript compiler API is gone.** `typescript@7` exports only `version` and
`versionMajorMinor`. The AST moved to the `typescript/unstable/*` entrypoints and is
reshaped: there is a scanner and the `SyntaxKind`/`is*` surface, but no `createSourceFile`
parser and no `createPrinter`. Any build script that imports `typescript` for its AST
needs a 6.x installed alongside, or a rewrite.

**typescript-eslint does not support it.** Every published version, canary included, peers
on `typescript >=4.8.4 <6.1.0` and fails outright with `typescript-eslint does not support
TS 7.0`. A project that lints with type-aware rules must stay on 6.x until that lands.

The compiler is also stricter, in ways that surface as new errors on code 6 accepted —
JSDoc is parsed more strictly, and assignability is tightened (notably `Ref<T>` against
`Ref<T> | undefined` under `exactOptionalPropertyTypes`, and generic-schema variance).
Expect to fix real type errors, not just to swap the dependency.

Upgrade the type-checker independently of the toolchain: datamitsu's managed `tsc` runs
7.x as its own isolated app, while the `eslint` app keeps its own 6.x, so the two never
collide.

---

## Based on

[@codecompose/typescript-config](https://github.com/0x80/typescript-config/commit/58337f95dea59ca25031ffa55a593bda5c78b882) by 0x80.
