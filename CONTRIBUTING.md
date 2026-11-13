# Contributing

## Development launcher

Use `pnpm dm` in this repository. Its package script sets `DATAMITSU_DEV_MODE` and
`DATAMITSU_PACKAGE_NAME`, and records `pnpm dm` for later invocations by generated hooks.
Calling `node bin/datamitsu.js` directly does not set those development inputs.

A fresh worktree needs installed dependencies and the built configuration bundle before
this launcher can load the local core and configuration. The recorded command is not a
dependency-installation or build bootstrap. Published consumers use their own package-manager
launcher; this override applies only to this repository's development script.

## Releases

Releases are automated via GitHub Actions ([release.yml](.github/workflows/release.yml)).

`package.json` version is synced automatically from the git tag during CI — no manual update needed.

### Stable release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Publishes: GitHub Release, npm, Docker (GHCR).

### Release candidate

```bash
git tag v1.0.0-rc.1
git push origin v1.0.0-rc.1
```

Same as stable, but marked as prerelease on GitHub. npm tag: `next`.

### Unstable release

Actions > Release > Run workflow > release_type: `unstable`.

Publishes: npm (`unstable` tag), Docker (GHCR only). No GitHub Release.

### Distribution channels

| Channel        | Stable   | RC               | Unstable   |
| -------------- | -------- | ---------------- | ---------- |
| GitHub Release | yes      | yes (prerelease) | no         |
| npm            | `latest` | `next`           | `unstable` |
| GHCR           | yes      | yes              | yes        |

## Runtime registry updates

Run the existing registry task with the package-local core:

```bash
pnpm dm exec task -- pull:runtimes:update
```

The core generates the default uv runtime's `pythonDownloads` pins in
`src/datamitsu-config/registries/runtimes.json`. The task then refreshes
`src/datamitsu-config/registries/uv-python314.json` from the same pinned uv release's
Python catalog, preserving that compatibility runtime's declared Python version.
Both catalogs require SHA-256 pins; neither runtime falls back to uv's bundled
catalog or a host Python.

To deliberately change the compatibility interpreter version, pass the exact
version to its generator, then regenerate the build and documentation:

```bash
node scripts/sync-python-downloads.ts 3.14.8
pnpm dm exec task -- refresh
pnpm test
pnpm dm check
```

golangci-lint is a locked Go app, not an entry in the binary release registry.
Keep the Go runtime that builds it at least as new as the Go versions being linted;
the compiler also supplies the standard export-data importer embedded in the tool.
The linter also starts `go` from PATH to load the analyzed project. CI adds the
configured SDK's bin directory to PATH through `datamitsu runtime run go -- env GOROOT`;
building the linter alone does not select that subprocess's Go version. Consumer
environments must likewise provide a Go SDK compatible with their project's go.mod.

## OCI bundle annotations

The OCI map describes Docker COPY roots, not necessarily exact owned store targets.
For `python-data`, the publisher must observe and annotate
`.runtime-data/<runtime>/<identity>/python` inside the layer. Annotating only the
identity directory fails the seeder's integrity check, even when seeding unrelated apps.
Keep that check strict; do not omit Python layers or weaken validation to pass release smoke.

After changing layer annotations, verify subtree resolution against actual tar entry names
and run the bundle seed/offline execution smoke on a newly produced bundle. Retrying a smoke
job against an already published malformed bundle does not repair its annotations.
