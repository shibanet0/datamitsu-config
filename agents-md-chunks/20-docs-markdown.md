## Documentation Surface

These rules are for documentation that is **not published**: Markdown files read in the repository itself, with no site built from them. If the project builds a documentation site, it needs `agents-docs-website.md` instead — tell the user rather than applying the rules below to the site.

All user-facing documentation lives in Markdown files within the repository. Primary surfaces:

- **`docs/`** — detailed guides, API reference, architecture docs, command reference, config reference
- **`README.md`** — entry point; keep focused but may include more detail than a website-backed project

### README.md Scope

README serves as the primary documentation entry point. Include:

1. **What is this** — One paragraph description
2. **Quick install** — Single command
3. **Basic usage** — Minimal example (3-5 lines of code)
4. **Links** — Point to relevant `docs/` files for deeper topics

Keep README focused. Detailed architecture explanations and full API references belong in `docs/`, not inline.
