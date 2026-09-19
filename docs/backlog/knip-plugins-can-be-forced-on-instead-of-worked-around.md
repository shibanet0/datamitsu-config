---
worth: yes
where: src/apps/knip/index.ts:25
added: 2026-09-19
---

# knip's tool plugins can be switched on directly, instead of worked around with entry points

The base config names every managed config file as an `entry` point, because the eslint, prettier,
oxlint, commitlint and cspell plugins decide whether to run by looking for their tool in the
workspace manifest — and datamitsu hands the toolchain over as managed binaries outside
`node_modules`, so none of them ever find it. Naming the files as entry points stops them reading as
unused, which was measured at 183 fewer unused files and 86 fewer unused devDependencies.

What it does not do is make the plugins run, and the config says so: "a plugin named as a string
inside a config is still invisible, which is what `ignoreDependencies` is for."

**There is a direct switch.** `WorkspaceWorker.determineEnabledPlugins` checks the config before it
checks the manifest:

```ts
if (this.config[pluginName]) {
  this.enabledPluginsMap[pluginName] = true;
  enabledPlugins.push(pluginName);
  continue; // isEnabled is never called
}
```

Any truthy value under a plugin's name enables it, manifest or not.

## Measured

A fixture with `prettier.config.mjs` declaring `plugins: ["prettier-plugin-nowhere"]`, and no
`prettier` in `package.json`:

| config                                              | result                                  |
| --------------------------------------------------- | --------------------------------------- |
| `entry: ["prettier.config.mjs"]` — today's approach | clean; the declared plugin is invisible |
| `prettier: { config: ["prettier.config.mjs"] }`     | `unlisted: prettier-plugin-nowhere`     |

The second also stops the config file reading as unused without naming it in `entry`, so it appears
to subsume the workaround rather than sit beside it.

## What is unresolved

Whether it is a straight replacement for `PROJECT_SCOPED_CONFIGS` / `GIT_ROOT_SCOPED_CONFIGS`, and
what it costs. Three things to settle before swapping:

- **Configuration hints.** Forcing a plugin on in a workspace that has no such config is what
  produced 391 hints against 83 once before, and that is why those two lists are split by `scope`
  today. A forced plugin may behave the same way, or worse.
- **The plugins contribute entry patterns of their own**, and restating a plugin's `config` replaces
  its defaults rather than extending them — the same trap the Playwright override fell into.
- **New findings are the point, and will arrive.** Restoring interpretation means every plugin named
  inside a managed config becomes a dependency knip expects to be declared. On a project consuming
  the managed toolchain that is likely to be a lot of `unlisted` at once, and the answer may be
  `ignoreDependencies` entries with reasons rather than a green run.

Measure on a monorepo, one plugin at a time, before changing the default.

## Found

Auditing knip's full configuration surface against what this package sets, before calling the setup
finished. It was the one option we had never considered, and it is more capable than the workaround
built in its place.
