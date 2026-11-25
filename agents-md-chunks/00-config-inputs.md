## Single Source for Constants, Env & Build Inputs

Route shared constants, environment variables, and build-time flags for each project (or monorepo app set) through ONE declared, validated access point; ad-hoc reads are forbidden. During setup or maintenance, if you find an inline constant, raw env read, or build flag that belongs there, STOP and tell the user before continuing.

### Constants

Declare shared constants in one project module (Go package, JS/TS module); do not scatter magic values. For constants shared across languages (e.g. Go + JS), use one JSON manifest and generate language files with a codegen script, never hand-maintain copies. Generated files need header comments naming the manifest and generator. Keep the manifest as the sole source of truth: generate disposable outputs during builds, but explicitly refresh committed files with the applicable `generate` command, not every build. TypeScript is a suitable default generator language, but choice is situational.

### Environment Variables

Use one env module per project (Go `env` package or TS `env.ts`) for all environment access.

- Forbid direct JS/TS `process.env` and Go `os.Getenv` elsewhere, except standard non-app vars genuinely needed by child processes (`PATH`, `HOME`, `CI`, …).
- Expose values through accessor functions, not bare mutable exports, with defaults alongside them.
- Parse, normalize, and validate all values here (including booleans, integers, enums, and app-specific coercion); the app consumes typed, valid values, never raw strings.
- Centralize keys so a variable rename is a one-line change.

### Build-Time Flags

Go `ldflags` and build tags, Rust `build.rs` / `cfg` / `env!`, and equivalents.

- Treat them exactly like env vars: funnel into one module with defaults, normalization, and typed accessors. Do NOT read raw ldflag-injected variables across the codebase.
- The app must not care whether a value came from an env var or a build flag — it reads one validated config surface.
