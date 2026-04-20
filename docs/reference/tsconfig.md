# TypeScript Configuration Guide

This package provides reusable TypeScript configurations for different project types.

## Requirements

- **TypeScript 6.0+** required
- Modern bundler (tsup, vite, esbuild)

## Quick Selection

| Project Type        | Monorepo? | Config                        |
| ------------------- | --------- | ----------------------------- |
| Next.js app         | Any       | `nextjs.json`                 |
| React + Vite app    | Any       | `base.json`                   |
| React library       | Yes       | `shared-react-library.json`   |
| React library       | No        | `react-library.json`          |
| Node.js library     | Yes       | `shared-library.json`         |
| Node.js library     | No        | `library.json`                |
| Backend API/service | Any       | `service.json`                |
| Node.js CLI         | Any       | `base.json` or `service.json` |
| E2E tests           | Any       | `base.json`                   |

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

**For:** Backend APIs, serverless functions, microservices

**Adds:**

- `types: ["node"]`
- `noEmit: true`

**Example:** Express API, AWS Lambda

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
pnpm add -D typescript@latest
```

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

## Based on

[@codecompose/typescript-config](https://github.com/0x80/typescript-config) by 0x80.
