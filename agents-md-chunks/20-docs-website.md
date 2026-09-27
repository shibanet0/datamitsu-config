## Documentation Surface

These rules are for documentation **published as a site** built from the repository. If the documentation is only Markdown files read in the repository, the project needs `agents-docs-markdown.md` instead — tell the user.

**All user-facing documentation lives in the documentation website. README.md files must remain minimal.** Reference pages, the command reference and the config reference all live there.

### Website Sources

Keep the site's sources in `website/` at the repository root, and point the generator's content directory there. Start new sites in `website/`; for an existing site kept elsewhere, propose migrating it. This is a default, not a hard rule — when the user or the project says the sources belong in `docs/` or anywhere else, do that.

`docs/` is for what is never published, such as `docs/backlog/` and `docs/plans/`. Most generators publish every file under their content directory, so a site built from `docs/` publishes those too.

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
- Store screenshots in the website's static assets with descriptive names
