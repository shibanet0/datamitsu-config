## Single Source for Constants, Env & Build Inputs

Every project (or set of apps in a monorepo) funnels its shared constants, environment variables, and build-time flags through ONE declared, validated access point. Reading these values ad-hoc anywhere else is forbidden. This holds when STARTING a project AND while MAINTAINING one: if you see a constant, a raw env read, or a build flag used inline where it belongs in the central point, STOP and tell the user before continuing.

**Why:** the full set of inputs stays discoverable in one place — trivial to rename, audit, give defaults, and reason about. Hunting scattered constants and env reads across a codebase later is the pain this rule removes.

### Constants

- Declare shared constants in a single module per project (Go: one package; JS/TS: one module). No magic values scattered across files.
- Constants that must be shared ACROSS languages (e.g. Go + JS in one monorepo): keep them in a single JSON manifest and generate the per-language files from it with a codegen script — do not maintain copies by hand.
  - Each generated file carries a header comment marking it as generated (naming the source manifest and the generator).
  - Prefer generating on demand at build time (the artifact need not be committed) over static committed copies. The manifest is the only source of truth.
  - The generator language is situational — TypeScript is a fine default.
  - This is the same manifest → codegen pattern that `datamitsu-config` uses for its `registries/*.json` → generated `.ts`.

### Environment Variables

One env module per project (Go: an `env` package; TS: an `env.ts`). ALL env access goes through it.

- Direct `process.env` (JS/TS) and `os.Getenv` (Go) are forbidden everywhere else — except the standard, non-app vars a child process genuinely needs (`PATH`, `HOME`, `CI`, …).
- Expose each value via an accessor (a function, not a bare mutable export): it cannot be reassigned by accident, and its default lives next to it.
- Do ALL parsing, normalization, and validation here — bool/int parsing, enum checks, coercion to the type the app expects. The rest of the app consumes an already-valid, typed value, never a raw string.
- Centralize the KEYS too, so renaming a variable is a one-line change.

### Build-Time Flags

Go `ldflags` and build tags, Rust `build.rs` / `cfg` / `env!`, and equivalents.

- Treat them exactly like env vars: funnel into one module with defaults, normalization, and typed accessors. Do NOT read raw ldflag-injected variables across the codebase.
- The app must not care whether a value came from an env var or a build flag — it reads one validated config surface.

Reference implementation: datamitsu's own `internal/env` (typed getters with defaults) and `internal/runtimeconfig` (env-resolved, validated effective config as a typed struct).
