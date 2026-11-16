# Lua Formatting

Datamitsu formats `.lua` and `.luau` files with [StyLua](https://github.com/JohnnyMorganz/StyLua), a deterministic native formatter. The managed app uses StyLua 2.6.0, with support for Lua and Luau syntax.

Datamitsu passes its managed `stylua.toml` explicitly to StyLua. By default, the config lives under
`.datamitsu/configs/`; do not edit that managed copy. It uses the shared indentation and line
width, spaces, and Unix line endings. To customize it, add `stylua` to `ejectConfigs` in your
`datamitsu.config.*`, run `pnpm dm config reconcile --tools stylua`, and edit the resulting
`stylua.toml`. Reconciliation preserves existing TOML overrides.

An existing `.stylua.toml` is not deleted. Datamitsu's explicit `--config-path` takes precedence
over native config discovery; move settings from the alternate file into the ejected
`stylua.toml` if Datamitsu should use them.

`dm fix` formats Lua files with StyLua's output verification enabled, and `dm lint` runs StyLua's `--check` mode and reports a diff without rewriting files. Both operations respect `.styluaignore` even though Datamitsu passes each selected file explicitly. Changes to `.styluaignore` invalidate lint results; the execution cache does not track nested ignore files automatically. StyLua is a formatter, not a Lua linter; no separate Lua lint rule set is enabled.

References:

- [StyLua documentation](https://github.com/JohnnyMorganz/StyLua)
- [StyLua 2.6.0 release](https://github.com/JohnnyMorganz/StyLua/releases/tag/v2.6.0)
