# @shibanet0/datamitsu-config

<p align="center">
  <img src="https://datamitsu.com/img/logo.png" alt="datamitsu" width="300" />
</p>

Shared configuration package for [datamitsu](https://datamitsu.com/) that provides a **comprehensive collection of development tools** with unified management. Install once, get linters, formatters, security scanners, and build tools — all versioned and configured together.

## Quick Start

Install via npm/pnpm:

```bash
pnpm add -D @shibanet0/datamitsu-config
pnpm dm init && pnpm dm setup && pnpm dm check
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
- **Spelling & docs** — cspell, Vale, markdownlint, Mermaid CLI

See [Apps](reference/apps.md) for the complete list.

## Documentation

- **[Getting Started](get-started/usage.md)** — Installation, configuration, and common workflows
- **[TypeScript Configurations](reference/tsconfig.md)** — Reusable tsconfig presets for different project types
- **[Apps](reference/apps.md)** — Auto-generated list of all managed apps

## Resources

- **GitHub Repository:** [shibanet0/datamitsu-config](https://github.com/shibanet0/datamitsu-config)
- **datamitsu:** [datamitsu.com](https://datamitsu.com/)

## License

MIT © Alexander Svinarev (shibanet0)
