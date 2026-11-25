## Privacy and Attribution

Everything written into the repository is public as soon as it is written, not when pushed. This includes documentation, plans, backlog entries, commit messages, PR descriptions, code comments, test fixtures, and issue text.

### Never write into the repository

- Absolute paths identifying a person, machine, or organization (`/home/<user>/…`, `C:\Users\…`); hostnames, IP addresses, and private-tracker ticket URLs.
- Credentials, tokens, license keys, and secret environment-variable values. Variable names are fine; values are not.
- Private-repository content, including file paths, package or branch names, code excerpts, and error messages quoting them.
- Customer, employer, or client names and indirect identifiers such as product names, distinctive dependencies, or domains.

If these details are needed for a measurement, bug report, or example, **anonymize it but preserve its shape**; that carries the meaning:

> ❌ `Measured on acme-storefront: apps/landing/pages/sitemap.xml.tsx fails to typecheck.`
> ✅ `Measured on a private TypeScript monorepo (≈15k tracked files, ~60 workspace packages): one
> package fails to typecheck because a generated file is missing.`

### Naming other projects requires explicit permission

Do not name another project, repository, author, or product, or attribute an approach to one, without the user's explicit permission in this conversation. This covers public and private projects and links as well as names.

Without that permission, describe the **idea** rather than its source:

> ❌ `Backlog entries follow the format used by <author>/<repo>.`
> ✅ Backlog entries carry `worth`/`where`/`added` frontmatter and a one-symptom title.

A pasted link is not permission to cite it. If attribution matters (for example, for a license obligation, quote, or design credit), ask before writing it down.

### Scope

These rules cover everything an agent writes or copies into the repository. When in doubt, anonymize.
