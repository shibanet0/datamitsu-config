# Usage Guide

How to install, configure, and use `@shibanet0/datamitsu-config` in your projects.

## Installation

Choose one of three installation methods based on your use case:

### Method 1: npm/pnpm Package (Recommended)

Install the package as a dev dependency:

```bash
pnpm add -D @shibanet0/datamitsu-config
```

After installation, the `postinstall` script automatically builds the config. You can then initialize datamitsu in your project:

```bash
pnpm dm init
```

This installs managed tool binaries. To initialize configuration files, run:

```bash
pnpm dm setup
```

This creates all necessary configuration files for the managed tools in your project.

**When to use:**

- Standard development workflow
- Projects using npm/pnpm for dependency management
- When you need the npm package ecosystem integration

### Method 2: Docker Images

Pre-built Docker images with all tools pre-installed for fast, consistent CI/CD.

**Stable releases (Debian default):**

```bash
# Pull latest stable
docker pull ghcr.io/shibanet0/datamitsu-config:latest

# Pull specific version (recommended for CI)
docker pull ghcr.io/shibanet0/datamitsu-config:0.0.4
```

**Stable releases (Alpine, smaller image):**

```bash
# Latest stable Alpine
docker pull ghcr.io/shibanet0/datamitsu-config:latest-alpine

# Specific version Alpine
docker pull ghcr.io/shibanet0/datamitsu-config:0.0.4-alpine
```

**Unstable builds (bleeding edge):**

```bash
# Latest unstable (Debian)
docker pull ghcr.io/shibanet0/datamitsu-config-unstable:unstable

# Latest unstable (Alpine)
docker pull ghcr.io/shibanet0/datamitsu-config-unstable:unstable-alpine
```

**Docker image features:**

- All tools pre-installed (via `datamitsu init --all`) — faster startup
- Multi-platform support: linux/amd64, linux/arm64
- Base configuration via `--before-config` flag (allows project config to override)
- **Stable registry** (`ghcr.io/shibanet0/datamitsu-config`):
  - `latest` / `latest-alpine` — latest stable release
  - `stable` / `stable-alpine` — same as latest
  - Semver versions: `0.0.4`, `0.0.4-alpine`
- **Unstable registry** (`ghcr.io/shibanet0/datamitsu-config-unstable`):
  - `unstable` / `unstable-alpine` — latest unstable build
  - Date-tagged: `unstable-YYYYMMDD-SHA`, `unstable-YYYYMMDD-SHA-alpine`

**Usage examples:**

```bash
# Run all checks in current directory
docker run --rm -v "$(pwd):/workspace" \
  ghcr.io/shibanet0/datamitsu-config:latest check

# Run with Alpine (smaller image)
docker run --rm -v "$(pwd):/workspace" \
  ghcr.io/shibanet0/datamitsu-config:latest-alpine check

# Run specific tool
docker run --rm -v "$(pwd):/workspace" \
  ghcr.io/shibanet0/datamitsu-config:latest exec eslint -- src/

# Use in CI with version pinning
docker run --rm -v "$(pwd):/workspace" \
  ghcr.io/shibanet0/datamitsu-config:0.0.4 check

# Override with local project config (config merging)
docker run --rm -v "$(pwd):/workspace" \
  ghcr.io/shibanet0/datamitsu-config:latest \
  --config /workspace/datamitsu.config.js check
```

**When to use:**

- CI/CD environments without Node.js dependency management
- Consistent tooling across different environments and platforms
- Fast CI runs (tools are pre-installed, no download time)
- Multi-platform builds (amd64, arm64)

**Container configuration merging:**

The Docker images use the `--before-config` flag in the ENTRYPOINT, which loads the container's config as a base layer. This allows your project's `datamitsu.config.js` to override or extend the base configuration when you pass `--config /workspace/datamitsu.config.js`.

**Container registries:**

- Stable: [ghcr.io/shibanet0/datamitsu-config](https://github.com/shibanet0/datamitsu-config/pkgs/container/datamitsu-config)
- Unstable: [ghcr.io/shibanet0/datamitsu-config-unstable](https://github.com/shibanet0/datamitsu-config/pkgs/container/datamitsu-config-unstable)

### Method 3: Remote Config

Reference this config as a remote base configuration in your project. datamitsu supports [remote configs](https://datamitsu.com/docs/how-to/use-remote-configs/) for centralized configuration management.

**Create `datamitsu.config.js` in your project:**

```javascript
function getRemoteConfigs() {
  return [
    {
      url: "https://github.com/shibanet0/datamitsu-config/releases/download/v0.0.4/datamitsu.config.js",
      hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", // SHA-256 hash
    },
  ];
}

function getConfig(config) {
  // config contains merged configuration from remote
  return {
    ...config,
    // Add project-specific overrides here
  };
}

globalThis.getRemoteConfigs = getRemoteConfigs;
globalThis.getConfig = getConfig;
globalThis.getMinVersion = () => "1.0.0";
```

**Get the SHA-256 hash for verification:**

Every remote config requires a SHA-256 hash for security. Get it from the releases page or compute it:

```bash
VERSION=v0.0.4
curl -sL "https://github.com/shibanet0/datamitsu-config/releases/download/${VERSION}/datamitsu.config.js" | sha256sum
```

**Then use datamitsu normally:**

```bash
datamitsu init
datamitsu check
```

**When to use:**

- Projects that don't use npm/pnpm
- Centralized configuration across multiple repositories
- Teams wanting to inherit a base configuration and customize per-project
- CI/CD environments with datamitsu already available

**How it works:**

- Remote config is fetched and verified against SHA-256 hash
- Configuration is cached locally in `{store}/.remote-configs/`
- Your local `getConfig()` receives the merged config from remote
- You can override or extend the remote configuration locally

**Security features:**

- SHA-256 hash verification is mandatory
- HTTPS-to-HTTP redirects are rejected
- 30-second timeout and 10 MiB size limit

**Important:**

- Pin to a specific version (not `latest`) since the hash changes with each release
- Update the hash in your config when upgrading to a new version
- See [remote configs guide](https://datamitsu.com/docs/how-to/use-remote-configs/) for advanced usage (inheritance chains, wrapper packages)

Browse all releases with SHA-256 hashes at [GitHub Releases](https://github.com/shibanet0/datamitsu-config/releases).

## Basic Usage

### Running checks

Run all configured linters and formatters in one pass:

```bash
pnpm dm check
```

This executes fixers (formatters, auto-fixes) followed by linters (type checking, ESLint, etc.). It should complete with no errors on a clean codebase.

### Running a specific tool

Execute any managed tool directly:

```bash
pnpm dm exec <tool-name> -- [tool-args]
```

For example, to run ESLint:

```bash
pnpm dm exec eslint -- src/
```

To list all available tools:

```bash
pnpm dm exec
```

## Configuration

### TypeScript

This package includes reusable tsconfig presets. Extend them in your `tsconfig.json`:

```json
{
  "extends": "@shibanet0/datamitsu-config/tsconfig/base.json"
}
```

Available presets:

| Preset                      | Use Case                              |
| --------------------------- | ------------------------------------- |
| `base.json`                 | Any TypeScript project                |
| `library.json`              | Standalone libraries                  |
| `react-library.json`        | Standalone React libraries            |
| `service.json`              | Backend services (Node.js)            |
| `service-worker.json`       | Backend services (Cloudflare Workers) |
| `shared-library.json`       | Libraries in a monorepo               |
| `shared-react-library.json` | React libraries in a monorepo         |
| `nextjs.json`               | Next.js applications                  |
| `infra-pulumi.json`         | Pulumi / Infrastructure-as-Code       |

### Git Hooks

datamitsu integrates with [lefthook](https://github.com/evilmartians/lefthook) for git hooks. After `pnpm dm init`, hooks are configured automatically:

- **pre-commit** — runs `dm check --file-scoped` on staged files, regenerates docs, and runs tests (sequentially)
- **commit-msg** — validates commit messages with commitlint (Conventional Commits)
- **post-checkout** — reinstalls dependencies and reinitializes datamitsu

### Customizing Tool Behavior

Individual tools (ESLint, Prettier, cspell, etc.) can be customized through their standard config files. datamitsu respects these files when present in your project root:

- `eslint.config.js` — ESLint configuration
- `.prettierrc` / `prettier.config.js` — Prettier configuration
- `cspell.json` — cspell dictionary and settings
- `knip.json` — Knip unused code configuration

## Common Workflows

### Setting up a new project

```bash
# Install the package
pnpm add -D @shibanet0/datamitsu-config

# Install tool binaries
pnpm dm init

# Initialize configuration files
pnpm dm setup

# Run all checks to verify setup
pnpm dm check
```

### Adding to an existing project

```bash
# Install
pnpm add -D @shibanet0/datamitsu-config

# Install tool binaries
pnpm dm init

# Initialize configuration files
pnpm dm setup

# Check for issues — expect some on first run
pnpm dm check

# Fix issues iteratively, or auto-fix what can be auto-fixed
pnpm dm check
```

### CI/CD integration

In CI pipelines, run checks after install:

**Method 1: npm/pnpm (traditional):**

```yaml
# GitHub Actions example
- run: pnpm install
- run: pnpm dm init # needed if postinstall was skipped (e.g. --ignore-scripts)
- run: pnpm dm check
```

datamitsu handles binary installation during `pnpm dm init`, which runs automatically as part of `postinstall`. In CI environments that use `--ignore-scripts`, run `pnpm dm init` explicitly.

**Method 2: Docker (faster, no dependencies):**

```yaml
# GitHub Actions example with Docker
- name: Run datamitsu checks
  run: |
    docker run --rm -v "${{ github.workspace }}:/workspace" \
      ghcr.io/shibanet0/datamitsu-config:0.0.4 check
```

**Docker advantages in CI:**

- No npm install or binary download time (tools pre-installed in image)
- Consistent environment across all CI runs
- Faster cold starts
- No Node.js version management needed

## Troubleshooting

### Bootstrap problem: missing datamitsu.config.js

If you see an error like "no such file or directory: datamitsu.config.js", the config file needs to be built first. This happens after a fresh clone or if the file was deleted.

Run the bootstrap command:

```bash
./node_modules/.bin/datamitsu --no-auto-config exec task -- build:datamitsu-config
```

This builds the config from source, moves it to the project root, and runs `pnpm dm init`.

### pnpm dm command not found

Ensure the package is installed as a dev dependency:

```bash
pnpm add -D @shibanet0/datamitsu-config
```

The `dm` binary is provided by this package. Verify it exists:

```bash
pnpm dm --help
```

### Tool binary not found

If a specific tool fails to run, reinitialize to download its binary:

```bash
pnpm dm init
```

### Checks failing on first run

This is expected when adding datamitsu to an existing project. Run `pnpm dm check` repeatedly — many issues are auto-fixed on each pass. For remaining issues, review the output and fix manually.

## Further Reading

- [Apps](../reference/apps.md) — full list of managed apps with versions and links
- [datamitsu documentation](https://datamitsu.com/) — comprehensive docs for the datamitsu tool manager
