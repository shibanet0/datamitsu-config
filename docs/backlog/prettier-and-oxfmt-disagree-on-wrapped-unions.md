---
worth: yes
where: src/datamitsu-config/globs.ts
added: 2026-09-18
---

# prettier and oxfmt both format TypeScript, and disagree on a wrapped union type

`prettierGlobs` and `oxfmtGlobs` both match `**/*.ts`, so every TypeScript file in a
project using this config is formatted twice, by two tools with independent opinions. On
most constructs they agree. On a union type long enough to wrap, they do not, and each
undoes the other:

The two forms are written as `text` below, not `ts`, on purpose: the formatters reach into
fenced TypeScript in Markdown as well, and rewrote the first example into the second the
first time this file was saved — erasing the thing it documents.

```text
// what oxfmt writes
export type IssueGroup =
  | "correctness"
  | "cycles"
  | "dependencies"
  | "exports"
  | "files"
  | "namespaces";

// what prettier rewrites it to
export type IssueGroup =
  "correctness" | "cycles" | "dependencies" | "exports" | "files" | "namespaces";
```

Reproduced in isolation on a seven-line file with no other content, alternating the two
managed binaries by hand: three full rounds, no convergence, each tool restoring its own
form every time. Both configurations carry the same `lineWidth` from `indentSettings`, so
this is not a width disagreement — it is a disagreement about how to break a union that
does not fit on the declaration line.

## Why it shows up as a `datamitsu check` failure

`_fixPriority` runs prettier before oxfmt, so a fix pass ends in oxfmt's form. The lint
pass then runs prettier, which rejects it. `datamitsu check` does both in one command, and
the result is a check that fails on a file `datamitsu fix` just wrote — with `datamitsu fix
--tools prettier` followed by `datamitsu lint --tools prettier` reporting zero problems,
because that pair never lets oxfmt have the last word. Swapping the order in `_fixPriority`
does not fix it; it only moves which tool is the one complaining.

## What is unresolved

Which tool should own TypeScript. AGENTS.md already states the rule this violates — "each
file-type concern (linting, formatting) should be handled by **one** dedicated tool, not
multiple overlapping ones" — so the question is not whether to pick one, but which, and
what is lost:

- **oxfmt only.** Fast, and already owns `.json`, `.css`, `.yaml`, `.toml` and more in
  `oxfmtGlobs`. But `prettierGlobs` is `eslintGlobs` plus `.d.ts` and `.md`, and prettier
  is the one with the plugin ecosystem this config already installs.
- **prettier only.** Keeps the plugins, drops the speed, and leaves oxfmt owning the
  non-JS file types it does not overlap on.

Either way the globs stop intersecting, and this class of loop stops being possible rather
than being worked around one construct at a time.

Whether other constructs diverge too is unknown — nothing here has looked beyond unions.
A sweep of both formatters over the same corpus would answer it and is the obvious first
step, since the answer bounds how urgent the choice is.

## Worked around

`src/apps/knip/index.ts` states `IssueGroup` as `(typeof ISSUE_GROUPS)[number]` over a
const array, because an array literal is a construct the two agree on. That is a dodge, not
a fix, and it is the only place currently known to hit this.

## Found

Adding a six-member union while wiring knip's `tags`, `--cache` and `--fix`. `datamitsu
check` had been failing on this file intermittently for some time with no explanation; this
is the explanation.
