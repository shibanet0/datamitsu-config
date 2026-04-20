## Documentation Surface

All user-facing documentation lives in Markdown files within the repository. Primary surfaces:

- **`docs/`** — detailed guides, API reference, architecture docs
- **`README.md`** — entry point; keep focused but may include more detail than a website-backed project

When implementing features or making changes, update the relevant `docs/` files or README in the same PR/commit:

- **CLI commands** → update command reference in `docs/`
- **Configuration options** → update config reference in `docs/`

### README.md Scope

README serves as the primary documentation entry point. Include:

1. **What is this** — One paragraph description
2. **Quick install** — Single command
3. **Basic usage** — Minimal example (3-5 lines of code)
4. **Links** — Point to relevant `docs/` files for deeper topics

Keep README focused. Detailed architecture explanations and full API references belong in `docs/`, not inline.
