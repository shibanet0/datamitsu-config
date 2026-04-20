# @shibanet0/datamitsu-config

<p align="center">
  <img src="https://datamitsu.com/img/logo.png" alt="datamitsu" width="400" />
</p>

Shared configuration package for [datamitsu](https://datamitsu.com/) that provides a comprehensive collection of development tools with unified management. Install once, get linters, formatters, security scanners, and build tools — all versioned and configured together.

## Installation

### npm/pnpm (recommended)

```bash
pnpm add -D @shibanet0/datamitsu-config
```

### Docker

Pre-built Docker images with all tools pre-installed for fast CI/CD:

**Stable releases (Debian default):**

```bash
# Latest stable
docker pull ghcr.io/shibanet0/datamitsu-config:latest

# Specific version
docker pull ghcr.io/shibanet0/datamitsu-config:0.0.4
```

**Stable releases (Alpine, smaller):**

```bash
docker pull ghcr.io/shibanet0/datamitsu-config:latest-alpine
```

**Unstable builds (bleeding edge):**

```bash
# Latest unstable (Debian)
docker pull ghcr.io/shibanet0/datamitsu-config-unstable:unstable

# Latest unstable (Alpine)
docker pull ghcr.io/shibanet0/datamitsu-config-unstable:unstable-alpine
```

**Usage:**

```bash
# Run checks
docker run --rm -v "$(pwd):/workspace" ghcr.io/shibanet0/datamitsu-config:latest check

# Run specific tool
docker run --rm -v "$(pwd):/workspace" ghcr.io/shibanet0/datamitsu-config:latest exec eslint -- src/
```

**Features:**

- Pre-installed tools (via `datamitsu init --all`)
- Multi-platform: linux/amd64, linux/arm64
- Separate registries for stable and unstable releases

**Container registries:**

- Stable: [ghcr.io/shibanet0/datamitsu-config](https://github.com/shibanet0/datamitsu-config/pkgs/container/datamitsu-config)
- Unstable: [ghcr.io/shibanet0/datamitsu-config-unstable](https://github.com/shibanet0/datamitsu-config/pkgs/container/datamitsu-config-unstable)

### Remote Config

Reference this config as a remote base configuration in your project's `datamitsu.config.js`:

```javascript
function getRemoteConfigs() {
  return [
    {
      url: "https://github.com/shibanet0/datamitsu-config/releases/download/v0.0.4/datamitsu.config.js",
      hash: "a1b2c3d4e5f6...", // SHA-256 hash (see releases page)
    },
  ];
}

globalThis.getRemoteConfigs = getRemoteConfigs;
```

**Get the SHA-256 hash for a specific version:**

```bash
VERSION=v0.0.4
curl -sL "https://github.com/shibanet0/datamitsu-config/releases/download/${VERSION}/datamitsu.config.js" | sha256sum
```

Your local `getConfig()` receives the merged configuration from this remote base. See [remote configs guide](https://datamitsu.com/docs/how-to/use-remote-configs/) for details on configuration inheritance and security.

**Note:** Pin to a specific version (not `latest`) since the hash changes with each release.

Browse all releases at [GitHub Releases](https://github.com/shibanet0/datamitsu-config/releases).

## Quick Start

After installation, initialize datamitsu in your project:

```bash
pnpm dm init
pnpm dm setup
pnpm dm check
```

`dm init` installs managed tool binaries. `dm setup` initializes configuration files. `dm check` runs all configured linters and formatters in one pass.

## What's Included

This config manages tools across multiple runtimes (Node.js, Go binaries, Python):

- **Linters & formatters** — ESLint, Prettier, oxlint, Ruff, ktlint, and more
- **Security scanners** — Semgrep, Trivy, Grype, Gitleaks, detect-secrets
- **Build tools** — TypeScript, protobuf (buf, protoc), OpenAPI generators
- **Git hooks** — commitlint, lefthook
- **Spelling & docs** — cspell, Vale, markdownlint, Mermaid CLI

See the [documentation site](https://datamitsu-config.shibanet0.com/) for complete information, or browse [docs/reference/tools.md](docs/reference/tools.md) for the full list of configured tools.

## Documentation

- [Documentation Site](https://datamitsu-config.shibanet0.com/) — full documentation with search and navigation
- [TypeScript Configurations](docs/reference/tsconfig.md) — reusable tsconfig presets for different project types
- [Configured Tools](docs/reference/tools.md) — auto-generated list of all managed tools
- [Usage Guide](docs/get-started/usage.md) — installation, configuration, and common workflows

For datamitsu documentation, visit [datamitsu.com](https://datamitsu.com/).

## License

MIT
