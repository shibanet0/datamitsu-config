---
worth: yes
where: .datamitsuignore:10
added: 2026-09-26
---

# This repository's dependencies carry 43 known vulnerabilities, and osv-scanner is off to keep CI green

osv-scanner 2.6.0 is the first release that reads the whole of a pnpm 11+ lockfile. Earlier releases
read only the first YAML document, which holds pnpm's own `packageManagerDependencies`, found 15
packages and passed. On this repository's `pnpm-lock.yaml` it now reads 1198 packages and reports 43
known vulnerabilities in 19 of them: 30 High, 11 Medium, 2 Low. Because it runs in CI, it is turned
off in `.datamitsuignore` alongside grype, trivy and bearer, which leaves this repository with no
dependency scanning at all.

The affected packages, from `dm exec osv-scanner -- scan source -L pnpm-lock.yaml`:

- vite 7.3.1 (3 High, 2 Medium)
- fast-uri 3.1.2 (6 High)
- js-yaml 4.1.1 (3 High, 1 Medium)
- brace-expansion 1.1.12 and 5.0.6 (6 High, 1 Medium)
- minimatch 3.1.2 (3 High)
- browserslist 4.28.2 (2 High)
- nanoid 3.3.12 (2 High)
- lodash 4.17.21, picomatch 2.3.1 and postcss 8.5.15 (1 High and 1 Medium each)
- deepmerge-ts 7.1.5 and smol-toml 1.6.1 (1 High each)
- lower severity: vitest and @vitest/mocker 4.1.7, @humanfs/node, baseline-browser-mapping, esbuild
  0.27.7 and 0.28.0

Most are transitive dependencies of the build and lint tooling rather than of anything the package
ships. Resolving them means a `pnpm update` pass, with `overrides` where a parent pins an old range.
Some may need an ignore entry with a reason, where the vulnerable code path is not reachable. The
work is not done yet because it belongs with a dependency bump, not with the registry update that
surfaced it. Once CI passes, remove `osv-scanner` from the `.datamitsuignore` line and trim that
comment.

Consumers are not affected by this switch: `.datamitsuignore` is local to this repository, so they
get osv-scanner 2.6.0 in CI and will see their own findings.

Found during the 2026-09 registry bump that moved osv-scanner from 2.5.1 to 2.6.0.

<!-- cspell:ignore humanfs smol -->
