---
worth: yes
where: src/datamitsu-config/managed-configs/prettier_config_mjs.ts:32
added: 2026-09-23
---

# eslint, oxlint and prettier run in a `typescript-project` whose config they never generate

The three tools declare `projectTypes: ["npm-package", "typescript-project"]`, so datamitsu
schedules a run for any directory holding a `tsconfig.json`. Their managed configs declare
`projectTypes: ["npm-package"]` alone, so `datamitsu config reconcile` writes nothing there. A
directory with a `tsconfig.json` and no `package.json` therefore gets a run that loads a config
which does not exist — and no amount of reconciling fixes it.

Reproduced on a fixture: a root npm package with a `types/` subdirectory containing only
`tsconfig.json`, `api.ts` and `style.css`. After `config reconcile --skip-fix` and `init`:

```
prettier -u --check --config .../types/prettier.config.mjs api.ts …
[error] Cannot find module '.../types/prettier.config.mjs'
```

`stylelint` is the same shape and was aligned when it was added (its managed config declares both
types), which is what made the gap in the other three visible. The anchors are
`prettier_config_mjs.ts:32`, `eslint_config_mjs.ts:32` and `oxlint_config_mts.ts:43`.

Not fixed in passing because the two ways out differ in who pays. Widening the managed configs to
`typescript-project` is one line each, but it changes what reconcile writes in every consuming
repository — new config files appear in directories that never had them. Narrowing the tools to
`npm-package` instead is equally small and loses linting for those directories, silently. Which is
right depends on whether a `tsconfig.json` without a manifest is a project anyone means to lint, and
that question was not worth answering in the middle of adding stylelint.

Note that `sort-package-json` and `knip` also declare both types; neither was checked, because
neither reads a per-project config file of this kind.
