# @shibanet0/datamitsu-config

<p align="center">
  <img src="https://datamitsu.com/img/logo.png" alt="datamitsu" width="300" />
</p>

Shared configuration package for [datamitsu](https://datamitsu.com/) that provides a **comprehensive collection of development tools** with unified management. Install once, get linters, formatters, security scanners, and build tools — all versioned and configured together.

## Quick Start

Install via npm/pnpm:

```bash
pnpm add -D @shibanet0/datamitsu-config
pnpm dm init && pnpm dm config reconcile && pnpm dm check
```

**Alternative installation methods:**

- 🐳 [Docker images](get-started/usage.md#method-2-docker-images) — pre-built with all tools
- 🌐 [Remote config](get-started/usage.md#method-3-remote-config) — use directly from URL

See [Usage Guide](get-started/usage.md) for detailed installation instructions.

## What's Included

This config manages tools across multiple runtimes (Node.js, Go binaries, Python):

- **Linters & formatters** — ESLint, Prettier, oxlint, Ruff, ktlint, and more
- **Security scanners** — Semgrep, Trivy, Grype, Gitleaks, detect-secrets
- **Build tools** — TypeScript, protobuf (buf, protoc), OpenAPI generators
- **Git hooks** — commitlint, lefthook
- **Spelling & docs** — cspell, markdownlint, lychee (links); Vale, Harper and Mermaid CLI on request

See [Apps](reference/apps.md) for the complete list.

## Config Inspector

Browse the resolved configuration — every app, its runtime and pinned version, every tool with its
scope, patterns and priorities, and the managed files — in datamitsu's
[Config Inspector](https://datamitsu.com/docs/guides/config-inspector). It is exported from the same
build as this site.

[Open the Config Inspector](https://datamitsu-config.shibanet0.com/atlas){ .md-button .md-button--primary }

The dataset behind it is attached to every release as
[`datamitsu-inspector-manifest.json`](https://github.com/shibanet0/datamitsu-config/releases/latest/download/datamitsu-inspector-manifest.json).

## Documentation

- **[Getting Started](get-started/usage.md)** — Installation, configuration, and common workflows
- **[TypeScript Configurations](reference/tsconfig.md)** — Reusable tsconfig presets for different project types
- **[Apps](reference/apps.md)** — Auto-generated list of all managed apps

## Resources

- **GitHub Repository:** [shibanet0/datamitsu-config](https://github.com/shibanet0/datamitsu-config)
- **datamitsu:** [datamitsu.com](https://datamitsu.com/)

## License

MIT © Alexander Svinarev (shibanet0)
