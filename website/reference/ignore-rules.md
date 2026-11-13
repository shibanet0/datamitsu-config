# Shared Ignore Rules

Datamitsu uses a shared ignore catalog to keep managed tools from scanning files they do not own.
The catalog is the source of truth. Ordered profiles select catalog entries for each consumer.

## Python bytecode cache

The gitignore profile excludes `__pycache__` directories at every depth with the canonical pattern
`**/__pycache__/`. This keeps generated Python bytecode out of version control. The entry is in the
shared catalog as `pycache`; do not add a separate pattern to a generated `.gitignore` source.

To change a managed ignore list, add or reuse an entry in `src/ignore/catalog.ts` and reference its
ID from each required profile in `src/ignore/profiles/`. See the ignore catalog guidance in the
repository's shared agent instructions for profile and consumer details.
