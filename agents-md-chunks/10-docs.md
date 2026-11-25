## Documentation Policy

Documentation is required for every user-facing change. Update it in the same PR/commit:

- **User-facing features:** add examples and guides.
- **API changes:** update reference docs.
- **CLI commands:** update the command reference.
- **Configuration options:** update the config reference.
- **Breaking changes:** document the migration path.

### Documentation Quality

- Review documentation as rigorously as code for clarity, accuracy, and completeness.
- **Test every code example before merging**; broken examples erode trust.

### Diagrams

- Use Mermaid for architectural diagrams; GitHub renders it natively in Markdown. Keep diagrams as code, and prefer them to long explanations of flows, architecture, or data pipelines.

### llms.txt Maintenance

If the project provides an `llms.txt` file (via its website or raw git URL, per [llmstxt.org](https://llmstxt.org/)):

- Keep it aligned with the documentation structure, with valid links to existing pages.
- Update it when adding major sections, packages, or resources; omit internal and draft documentation links.
