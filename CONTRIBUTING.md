# Contributing

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
