## Documentation Surface

These rules cover documentation published as a site. For repository-only Markdown, use `agents-docs-markdown.md` instead and tell the user.

**All user-facing documentation lives on the website; keep README.md minimal.** Put reference, command, and configuration pages there.

### Website Sources

By default, keep site sources in root-level `website/` and point the generator there. Start new sites there. If an existing site keeps its sources elsewhere, propose moving them to `website/`. Follow the user's or project's chosen location instead, including `docs/`.

Reserve `docs/` for unpublished material such as `docs/backlog/` and `docs/plans/`. Most generators publish every file in their content directory, so using `docs/` for site content also publishes that material.

### README.md Scope

Keep README minimal and focused on:

1. **What is this** — One-paragraph description.
2. **Quick install** — One command or a link to installation docs.
3. **Basic usage** — Minimal example (3-5 lines of code).
4. **Full documentation** — Link to the documentation website.

Do not add detailed usage guides, configuration examples, architecture explanations, or API references; put them on the website.

### Visual Documentation

- Add diagrams for complex architecture.
- Use screenshots to show UI features; store them in the website's static assets with descriptive names.
