---
worth: yes
where: src/datamitsu-config/managed-configs/oxlint_config_mts.ts:43
added: 2026-09-23
---

# oxlint runs in a `typescript-project` whose config it never generates

The oxlint tool declares `projectTypes: ["npm-package", "typescript-project"]`, so datamitsu
schedules it for any directory holding a `tsconfig.json`. Its managed config declares
`projectTypes: ["npm-package"]` alone, so `datamitsu config reconcile` writes nothing there. A
directory with a `tsconfig.json` and no `package.json` gets a run that loads
`{cwd}/oxlint.config.mts`, which does not exist — and no amount of reconciling fixes it.

Reproduced on a fixture: a root npm package with a `types/` subdirectory containing only
`tsconfig.json`, `api.ts` and `style.css`. The planner schedules oxlint in `types/` with
`-c …/types/oxlint.config.mts`.

prettier had the same shape and was widened to both project types; stylelint was aligned when it
was added. eslint never had it: its tool is `npm-package` only. oxlint cannot take the prettier fix,
because `oxlint.config.mts` imports `./package.json`, which such a directory does not have — the
widened config would fail to load instead of being missing. The two ways out:

- narrow the tool to `npm-package`, as eslint is, which silently loses linting in those
  directories;
- let the generator drop the manifest import where the location's project types do not include
  `npm-package` (`context.projectTypes` carries them during reconciliation).

Which is right depends on whether a `tsconfig.json` without a manifest is a project anyone means to
lint.

knip and syncpack show the same mismatch with a git-root config: their tools run in both project
types while `knip.config.js` and `.syncpackrc.json` are generated for `npm-package` only. That can
only bite a repository whose root has a `tsconfig.json` and no `package.json`, where neither tool
has anything to do; it was not reproduced.
