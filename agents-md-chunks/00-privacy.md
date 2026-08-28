## Privacy and Attribution

Anything written into the repository is published: documentation, plans, backlog entries, commit
messages, PR descriptions, code comments, test fixtures, issue text. Treat every one of them as
public the moment it is written, not the moment it is pushed.

### Never write into the repository

- Absolute paths that name a person, machine, or organization (`/home/<user>/…`, `C:\Users\…`),
  hostnames, IP addresses, ticket URLs from a private tracker.
- Credentials, tokens, license keys, or the values of environment variables that hold them — an
  environment variable's **name** is fine, its **value** is not.
- Contents copied out of a private repository: file paths, package names, branch names, code
  excerpts, error messages that quote them.
- Customer, employer, or client names, and anything that identifies them indirectly (a product
  name, a distinctive dependency, a domain).

If a measurement, a bug report, or an example needs one of these to make sense, **anonymize it and
keep the shape**, which is what carries the meaning:

> ❌ `Measured on acme-storefront: apps/landing/pages/sitemap.xml.tsx fails to typecheck.`
> ✅ `Measured on a private TypeScript monorepo (≈15k tracked files, ~60 workspace packages): one
package fails to typecheck because a generated file is missing.`

### Naming other projects requires explicit permission

Do not name another project, repository, author, or product — or describe an approach as coming
from one — unless the user has explicitly said you may in this conversation. This applies to
private and public projects alike, and to links as much as to names.

Without that permission, describe the **idea** rather than its source:

> ❌ `Backlog entries follow the format used by <author>/<repo>.`
> ✅ `Backlog entries carry `worth`/`where`/`added` frontmatter and a one-symptom title.`

A user pasting a link is not the same as a user granting permission to cite it. If the attribution
genuinely matters — a license obligation, a quoted excerpt, a design credit — ask before writing it
down.

### Scope

These rules bind everything an agent writes into the repository and everything an agent copies into
it. When in doubt, anonymize.
