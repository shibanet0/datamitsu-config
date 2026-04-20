## Documentation Surface

**All user-facing documentation lives in the documentation website. README.md files must remain minimal.**

When implementing features or making changes, documentation MUST be updated in the same PR/commit:

- **User-facing features** → update website docs with examples and guides
- **API changes** → update reference pages
- **CLI commands** → update command reference
- **Configuration options** → update config reference
- **Breaking changes** → document migration path

### README.md Scope

README must be kept **minimal** and focused on:

1. **What is this** — One paragraph description
2. **Quick install** — Single command or link to installation docs
3. **Basic usage** — Minimal example (3-5 lines of code)
4. **Link to full documentation** — Point to docs website

**Do NOT add to README.md:** detailed usage guides, configuration examples, architecture explanations, or API reference. These belong in the documentation website.

### Visual Documentation

- Add diagrams for complex architectural concepts
- Use screenshots for UI-related features — show, don't just tell
- Keep diagrams as code (Mermaid preferred) for version control
- Store screenshots in the website's static assets with descriptive names
