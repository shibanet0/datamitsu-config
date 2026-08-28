## Documentation Policy

Documentation is a required deliverable for every user-facing change — not optional.

When implementing features or making changes, documentation MUST be updated in the same PR/commit:

- **User-facing features** → update docs with examples and guides
- **API changes** → update reference docs
- **CLI commands** → update the command reference
- **Configuration options** → update the config reference
- **Breaking changes** → document migration path

### Documentation Quality

- Review documentation changes with the same rigor as code
- Check for clarity, accuracy, and completeness
- **Test all code examples before merging** — examples that don't work erode trust

### Diagrams

- Use Mermaid for architectural diagrams — GitHub renders them natively in Markdown
- Keep diagrams as code for version control
- Prefer diagrams over lengthy textual explanations for flows, architecture, and data pipelines

### llms.txt Maintenance

If the project provides an `llms.txt` file (served via website or accessible via raw git URL, per [llmstxt.org](https://llmstxt.org/)):

- Keep it in sync with the actual documentation structure
- All links must point to valid, existing pages
- Update when adding new major sections, packages, or resources
- Do not add internal or draft documentation links
