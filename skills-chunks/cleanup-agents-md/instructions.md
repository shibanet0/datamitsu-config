# Cleanup AGENTS.md

You are about to clean up the project's `AGENTS.md`. The job has two halves:

1. **Remove what is already guaranteed elsewhere** — content covered by the shared chunks deployed
   via [datamitsu](https://datamitsu.com/) into `.datamitsu/ai/agents/agents-*.md`, and non-rule
   content (architecture docs, templates, release notes) that belongs in its own file.
2. **Compact what is left** — without changing what an agent reading the file would do.

The shared chunks are the **source of truth**. The project's `AGENTS.md` should contain only what is
specific to this project and not covered by the chunks. Additionally, `AGENTS.md` is for
**prescriptive rules** — descriptive documentation of internals belongs in dedicated docs files, not
in agent instructions.

The goal is **not** fewer lines. It is the smallest number of tokens an agent needs to reproduce the
same behavior — with every rule, condition, exception, exact literal and degree of obligation
intact. A cleanup that removes 60% of the lines and one unique rule is a failure.

This skill is destructive — it rewrites `AGENTS.md` and may create new files. Always follow the
propose → confirm → apply order. Never apply without explicit confirmation.

---

## Invariants

These hold at every step. If an action would break one, do not take it — report instead.

1. **No silent rule loss.** Every prescriptive statement in the original ends up with an explicit
   disposition (Step 6). "It disappeared" is not a disposition.
2. **No silent conflict resolution.** Similar-but-different statements are never canonicalized into
   one without proven equivalence. Report them; do not pick a winner.
3. **Normative strength is preserved.** `NEVER` does not become `avoid`; `prefer` does not become
   `always`.
4. **Exact literals are preserved.** Commands, flags, paths, package names, identifiers, config keys
   and versions are never rewritten from memory, "corrected", or normalized.
5. **The chunk is read-only.** Nothing under `.datamitsu/` is modified, ever.
6. **Project exceptions survive.** A rule that extends or contradicts a chunk rule is not a
   duplicate — it is the reason the project has an `AGENTS.md`.
7. **Propose before mutate.** No destructive change without explicit confirmation.
8. **Semantics over line count.** Quality is measured by behavior preserved, not by percentage
   removed.

---

## Step 1 — Discovery

1. Read `AGENTS.md` from the project root.
2. Find the **bootstrap line** — a single bold paragraph starting with `**Read [.datamitsu/`.
3. Parse the path inside the link to identify the active chunk file. Expected values:
   - `.datamitsu/ai/agents/agents-base.md`
   - `.datamitsu/ai/agents/agents-docs-markdown.md`
   - `.datamitsu/ai/agents/agents-docs-website.md`
4. Read the referenced chunk file. Treat it as read-only — never modify anything in `.datamitsu/`.
5. If the bootstrap line is missing or points outside `.datamitsu/`, abort:
   > This project's `AGENTS.md` does not reference any datamitsu chunk. This skill only works with
   > datamitsu-managed projects. Aborting.

If `CLAUDE.md` exists in the project root **as a real file** (not a symlink to `AGENTS.md`), note it
and report at the end — do not auto-merge.

Survey the project structure to determine extraction targets:

- Does `docs/` exist? If so, note subdirectories (e.g., `docs/architecture/`, `docs/guides/`,
  `docs/templates/`).
- Does `CHANGELOG.md` exist?
- Note the project name and purpose from `package.json`, `README.md`, or similar.

---

## Step 2 — Parse into regions

Identify three regions in this exact order:

1. **Override block** — everything between the `# AGENTS.md` heading and the bootstrap line. May be
   empty. Project-specific overrides of chunk rules live here. **Never modify.**
2. **Bootstrap line** — the one bold paragraph that references the chunk. **Never modify.**
3. **Project content** — everything below the bootstrap line. Split into sections by `##` (h2)
   headings. Subsections (`###` and deeper) belong to their parent section.

Sections are the unit of **structure and reporting**. They are not the unit of decision — that is
Step 3.

---

## Step 3 — Atomize

A whole section is too coarse to classify. One section routinely contains a prescriptive rule, a
paragraph of architecture, a rationale, an example, a project-specific exception and a chunk
duplicate — all at once, and each wants a different action.

Break the content down:

```text
Section
  → semantic spans          (a contiguous run of lines that says one thing)
    → atomic statements     (one rule, one condition, one exception, one example)
```

Assign every span a **role**:

| Role          | What it is                                                      | Can compact?                        |
| ------------- | --------------------------------------------------------------- | ----------------------------------- |
| `rule`        | Prescriptive — tells the reader to do or not do something       | Wording yes, meaning no             |
| `condition`   | When the rule applies                                           | Never drop                          |
| `exception`   | When the rule does not apply                                    | Never drop                          |
| `rationale`   | Why the rule exists                                             | Drop unless it resolves ambiguity   |
| `example`     | Shows the rule in use                                           | Drop unless it defines the contract |
| `descriptive` | How the system works; asks nothing of the reader                | Extract, do not compact             |
| `literal`     | An exact command, path, flag, identifier, config key or version | Never rewrite                       |

### Normative strength

Modality is part of a rule's meaning. These tiers are **not** interchangeable:

```text
NEVER / MUST NOT  >  MUST / ALWAYS  >  SHOULD  >  PREFER  >  MAY  >  descriptive
```

Record the tier of every `rule` span. Compaction may not weaken it and may not strengthen it.

> `Prefer X.` is not `Always use X.`
> `Never bypass commit hooks.` is not `Do not normally bypass commit hooks.`

### Exact literals

Record every literal verbatim: commands and their exact shape, paths, flags, script names, package
names, identifiers, config keys, versions, environment variable names, and any `<!-- hits: N -->`
markers.

`pnpm exec dm check` and `pnpm dm check` are **different strings**. Never "improve" a literal from
memory, and never reconcile two variants of one. If you believe a literal in the file is wrong,
report it as a conflict — fixing it is not this skill's job.

---

## Step 4 — Classify each span

Every span gets exactly one category. A single section may produce deletions, extractions and
retained rules simultaneously — that is normal and expected.

### Against the chunk

| Category              | Definition                                                | Action                         |
| --------------------- | --------------------------------------------------------- | ------------------------------ |
| `duplicate-of-chunk`  | Semantically covered by a rule in the active chunk        | Delete                         |
| `project-unique-rule` | Prescriptive rule specific to this project, not in chunks | Keep semantics (Step 5)        |
| `project-exception`   | Extends or contradicts a chunk rule for this project      | Keep; never treat as duplicate |

`partial-duplicate` is no longer a category — it was an artifact of classifying whole sections. At
span level a mixed section simply yields some `duplicate-of-chunk` spans and some kept ones.

### Against the rest of the project file

| Category                     | Definition                                                      | Action                                  |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| `internal-duplicate`         | Says the same thing as another span in this file                | Merge into one canonical spot           |
| `internal-partial-duplicate` | Overlaps another span but adds a condition or exception         | Merge, keeping every distinct condition |
| `complementary`              | Refines another span rather than repeating it                   | Keep both                               |
| `potential-conflict`         | Similar to another span but differs in a way you cannot resolve | Keep both, report (Step 4.1)            |

**Duplicate is not the same as complementary.** These two are not one rule:

```text
Run tests before finishing.
Run integration tests when infrastructure changed.
```

Merging them into "Run tests" silently deletes a condition. Keep both, or merge into a single
statement that still carries the condition.

### By content type

| Category               | Definition                                                                       | Action                             |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| `pitfall`              | A specific bug, race or footgun in this codebase                                 | Keep semantics; may compact        |
| `deferred-work`        | A defect, gap or drift recorded but not fixed — no rule for the reader to follow | Relocate to `docs/backlog/`        |
| `architectural-detail` | Descriptive documentation of a subsystem (not a rule)                            | Extract to docs file               |
| `template-material`    | Reusable template skeleton (e.g., installation tabs, annotation boilerplate)     | Extract to docs file               |
| `release-note`         | Description of a past migration or breaking change                               | Extract to docs or CHANGELOG       |
| `migration-cruft`      | Wrapper headings/boilerplate left from a CLAUDE.md→AGENTS.md migration           | Strip cruft, integrate content     |
| `project-context`      | README-style content (mission, package list, repo tree, key deps)                | Keep the minimum; extract the rest |

### Step 4.1 — Conflict detection

**Similarity is not equivalence.** Two statements are duplicates only if you can demonstrate they
mean the same thing. They are **not** duplicates if they differ in any of:

- command literal · path · flag · package name
- scope · condition · exception · negation
- normative strength

When they differ and the context does not let you prove which is correct, classify both as
`potential-conflict`:

```text
pnpm exec dm check
pnpm dm check
```

The skill does not pick a winner because the two commands resolve differently. Keep both spans in
place, list them under **Potential conflicts** in the proposal, and let the user decide. Destructive
canonicalization without sufficient grounds is forbidden.

### Classification rules

**Semantic, not textual.** Project spans often reword chunk rules in different words. Same intent
and content = duplicate, regardless of wording.

**Prescriptive vs descriptive distinguishes rule from architecture.** A 60-line description of how
the retry orchestrator works internally is `architectural-detail`. A 2-line statement "always call
`markRetryHealthyBoot` after a successful boot, otherwise X" is `project-unique-rule`. Length is not
the criterion — the question is "does this tell the agent what to do (rule)" or "does this describe
how the system works (architecture)".

**Pitfall detection.** A span is a `pitfall` if any of these match:

- Its heading contains: `Pitfall`, `Known Pitfalls`, `Известные проблемы`, `Подводные камни`,
  `Gotcha`, `Common mistakes`, `Lessons learned`
- It belongs to a parent section matching those patterns
- It describes a specific bug, race, footgun, or mistake to avoid in this codebase
- It contains `<!-- hits: N -->` markers — these are project state and must be preserved exactly

**Deferred work vs pitfall.** Both describe something wrong, and they are told apart by what the
reader is supposed to do:

- A **pitfall** tells the reader how to avoid stepping on something. It changes what they do today.
  "`pnpm test` must run with `umask 022` or the source-mode tests fail on the test binary's own
  mode" is a pitfall — knowing it changes the next command you type.
- **Deferred work** is a defect nobody is fixing right now, with nothing for the reader to do
  differently. "The store grows without bound; every config-hash change orphans a directory" is
  deferred work — there is no behavior it asks of the reader, only an action waiting for somebody.

Markers of `deferred-work`: "TODO", "FIXME", "not implemented yet", "should eventually", "known
limitation", "we plan to", a described bug with no workaround given.

Relocate these to `docs/backlog/`, one file per item, in the format the `backlog` skill defines.
**Never delete them.** They are the most expensive content in the file — written when the problem
was understood — and deleting them destroys exactly what the backlog exists to preserve. When in
doubt between `pitfall` and `deferred-work`, keep it as a pitfall: leaving it in `AGENTS.md` costs a
few lines, and losing it costs the investigation.

**Project context is judged by necessity, not by length.** Keep only the minimum context an agent
needs to interpret the prescriptive rules that follow; extract the rest regardless of how short it
is. "This repository contains the CLI and its documentation website" earns its place if later rules
say "CLI" and "website". A mission statement, a repo tree, a full package catalog, a dependency
list, or an architecture overview that prescribes nothing does not — a README-style paragraph does
not become an agent instruction by being 19 lines long.

**Migration cruft detection.** A section is `migration-cruft` if:

- Heading is "Migrated From CLAUDE.md", "From CLAUDE.md", or similar migration-provenance heading
- It contains only a child `# CLAUDE.md` heading and/or boilerplate like "This file provides
  guidance to Claude Code (claude.ai/code)..." with no prescriptive rules
- It wraps other sections that would otherwise be top-level — the wrapper itself is cruft, the
  wrapped content is classified independently

When stripping migration cruft: remove the wrapper heading and any boilerplate lines. Promote
wrapped subsections one heading level up (e.g., `###` under `## Migrated From CLAUDE.md` becomes
`##`). Preserve all prescriptive content inside.

**Misplaced overrides.** If a span explicitly contradicts or extends a chunk rule (e.g., "in this
fork, commits follow the upstream format, not Conventional Commits"), it is a legitimate override —
but it should live in the override block above the bootstrap line, not below. Classify as
`project-exception` and add a note: "Consider moving to override block above bootstrap line".

**Be conservative.** When in doubt between `duplicate-of-chunk` and `project-unique-rule`, choose
`project-unique-rule`. False positive (deleting useful project content) is worse than false negative
(leaving a small duplicate).

**Deletion is the only irreversible action this skill takes.** Every other category relocates its
content — to a docs file, to `CHANGELOG.md`, to `docs/backlog/` — and relocation is recoverable by
reading the new file. Only `duplicate-of-chunk` deletes, and it is safe solely because the content
still exists in the chunk. If a span does not fit a category, relocate it rather than delete it, and
say where it went.

### Extraction target selection

When a span is classified for extraction, choose a target file:

1. **`architectural-detail`** → `docs/architecture/<slugified-heading>.md`. If `docs/architecture/`
   does not exist but `docs/` does, create it. If `docs/` does not exist, use
   `docs/<slugified-heading>.md`.
2. **`template-material`** → `docs/templates/<slugified-heading>.md`. Same directory creation rules.
3. **`release-note`** → append to `CHANGELOG.md` if it exists, otherwise `docs/changelog.md`.
4. **`project-context`** (beyond the minimum) → `docs/<slugified-heading>.md`, or merge into
   `README.md` if the content is clearly README material.

Slugify: lowercase, replace spaces with hyphens, remove special characters. E.g., "Important
Implementation Details" → `important-implementation-details.md`.

If the target file already exists, append the extracted content under a new `## <original heading>`
at the end of that file.

---

## Step 5 — Compact what is retained

`Keep` means **preserve the semantics, not the wording**. A retained rule may be shortened,
normalized, merged with an equivalent local rule, or moved next to a related rule — provided its
scope, modality, conditions, exceptions and exact literals survive intact.

### Policy

1. Keep every unique prescriptive rule.
2. Keep its normative strength.
3. Keep scope, conditions, exceptions and negations.
4. Keep exact literals verbatim — the list in Step 3.
5. Drop rationale that does not change how the rule is interpreted.
6. Reduce rationale to one short clause when it is what removes an ambiguity.
7. Drop examples that only restate a rule that is already unambiguous.
8. Keep a minimal example when it is the actual syntax or behavior contract.
9. Merge only semantically equivalent statements.
10. Never merge statements because they use similar words.

A safe compaction:

```text
Before:
It is very important that developers never use process.env directly throughout the
application. Instead, all environment variables should always be accessed through our
env module so that validation and parsing remain centralized.

After:
- Never read `process.env` outside the central env module.
```

The obligation (`never`), the literal (`process.env`) and the scope (outside the env module) all
survive. The rationale is dropped because knowing _why_ does not change what the reader does.

### Order of optimization

Always in this order — each step shrinks the input to the next:

1. Remove what the active chunk already guarantees.
2. Remove internal semantic duplicates.
3. Extract non-prescriptive documentation.
4. Remove redundant rationale.
5. Remove redundant examples.
6. Compact the wording of retained rules.
7. Group retained rules that belong together.
8. Only then consider formatting and line count.

### Never optimize by

- Removing project-specific behavior, scope, conditions, exceptions or negations.
- Changing `MUST` / `SHOULD` / `PREFER` / `NEVER`.
- Changing an exact command, path, flag or identifier.
- Guessing between two conflicting variants.

### Pitfalls are protected, not frozen

`Keep pitfall` does not mean "keep every sentence verbatim". A pitfall compacts well into:

```text
trigger/context → failure mode → required action
```

A long history of how a bug was discovered can become:

```text
- Before closing the DB, stop the checkpoint worker; otherwise shutdown races the WAL checkpoint.
```

provided the history does not change what the reader does. `<!-- hits: N -->` markers are project
state and are carried across exactly.

### Wholesale restructuring is out of scope

Grouping related rules under one heading is allowed — that is step 7 of the order above.
Reorganizing the file's section structure wholesale is not: it buries the real changes in a diff the
user cannot review, and it recovers no tokens. Keep section order stable unless a section becomes
empty.

---

## Step 6 — Coverage audit

Run this **before writing anything**. It is the main defense against losing a rare but critical
instruction.

Every atomic prescriptive statement in the original must map to exactly one disposition:

```text
Original atomic rule
  → retained (possibly reworded)
  → normalized into rule X
  → merged into equivalent rule X
  → guaranteed by chunk rule X
  → preserved as a project-specific exception
  → relocated to <file>
  → reported as a conflict
```

There is no valid disposition "disappeared".

Then check literals: every exact literal recorded in Step 3 must appear verbatim in the result, in
the file it was relocated to, or in a reported conflict.

**If either check fails, abort before touching any file** and report which statement or literal has
no disposition. An incomplete audit is a bug in the analysis, not a reason to proceed carefully.

---

## Step 7 — Propose

Build a report and present it to the user. Do not apply yet.

Structure the report exactly like this:

```text
## Cleanup plan for AGENTS.md

Active chunk: `.datamitsu/ai/agents/agents-XXX.md`
Project AGENTS.md: <M> sections, <R> prescriptive rules, <K> lines

### To delete (guaranteed by the chunk)

1. **"<heading>"** (lines a-b) — <N> spans
   Covered by: chunk § "<chunk section>"
   Why: <one-line semantic summary of the overlap>

### To merge (internal duplicates)

2. **"<heading>"** (lines a-b) + **"<heading>"** (lines c-d)
   Canonical location: <where the merged rule lands>
   Conditions preserved: <the distinct conditions that survive the merge>

### To compact

3. **"<heading>"** (lines a-b) → ~<n> lines
   Dropping: <rationale / examples being removed>
   Preserved: <modality, literals, conditions, exceptions>

### To extract (non-rule content → separate files)

4. **"<heading>"** (lines a-b) — <category>
   Target: `<target file path>`
   Why: <one-line reason>

### To move to the backlog (deferred work)

5. **"<heading>"** (lines a-b)
   Target: `docs/backlog/<slug>.md` — `worth: <yes|later|no>`
   Why: <one-line reason it is deferred work rather than a pitfall>

### To clean up (migration cruft)

6. **"<heading>"** (lines a-b)
   Action: <what will be stripped/promoted>
   Why: <one-line reason>

### To keep (project-unique rules, exceptions and pitfalls)

7. "<heading>" (lines a-b) — <category>

### Potential conflicts (no change made — your call)

8. **<short label>**
   A: `<variant A>` (line a) — <where it appears>
   B: `<variant B>` (line b) — <where it appears>
   Differs in: <literal | scope | condition | exception | negation | normative strength>
   Both kept. <one line on why they cannot be proven equivalent>

---

Summary

Semantic rules before:        <R>
Semantic rules after:         <R'>
Unique rules removed:         0
Chunk duplicates removed:     <N>
Internal duplicates merged:   <N>
Rationale/examples dropped:   <N> spans
Conflicts needing a decision: <N>

Files to create/update:
- `<target file 1>` (new) — <N> lines
- `<target file 2>` (append) — <N> lines

Line count (secondary): <K> → ~<K_after>

Apply changes? Reply: yes / no / show diff
```

**`Unique rules removed` must be 0.** If it is not, the analysis is wrong — do not offer to apply.
Go back to Step 6, find the statement with no disposition, and fix the classification.

If the user replies `show diff`, print the unified diff between the current `AGENTS.md` and the
planned result, plus the content of each file to be created. Then ask again.

If the user replies `no`, abort. Do not modify anything.

If the user replies `yes`, proceed to Step 8.

---

## Step 8 — Apply

After explicit `yes`:

1. **Create extraction target files first.** For each extracted span:
   - Create parent directories if needed.
   - If the target file is new, write a `# <heading>` title and the extracted content.
   - If the target file exists, append `\n\n## <heading>\n\n` + content at the end.
2. **Write backlog entries.** For each `deferred-work` item, create `docs/backlog/` if absent and
   write one file per item in the format the `backlog` skill defines — slug naming the symptom,
   `worth`/`where`/`added` frontmatter, `added` set to today. Carry the original wording across;
   this is a move, not a summary. Apply the privacy rules: an item quoting a private path or another
   project is anonymized on the way over.
3. **Clean up migration cruft.** Strip wrapper headings and boilerplate, promote child sections.
4. **Apply deletes, merges and compactions** in order from **bottom to top** of `AGENTS.md` (so line
   numbers don't shift mid-edit).
5. **Remove extracted and relocated spans** from `AGENTS.md` (also bottom to top).
6. Preserve everything not touched: the override block, the bootstrap line, the `# AGENTS.md`
   heading, all `potential-conflict` spans, and section ordering elsewhere.
7. Write the result back to `AGENTS.md`.
8. **Verify after writing.** Re-read the written file and confirm every literal recorded in Step 3
   is present in it or in a file it moved to. If one is missing, say so immediately and loudly —
   the user still has the pre-run state in git.

Do not create backup files. Git is the backup. The user committed before running this — if they
didn't, that's user error and aborting too late won't help.

---

## Step 9 — Report

After writing, print a final summary:

```text
Done.

Semantic rules: <R> → <R'> (0 unique rules lost)
AGENTS.md: <K_before> → <K_after> lines (-<delta>%)

- Deleted: <N> spans (chunk duplicates)
- Merged: <N> internal duplicates
- Compacted: <N> spans (rationale/examples dropped)
- Extracted: <N> spans → <N> files
- Moved to backlog: <N> items → `docs/backlog/`
- Cleaned up: <N> sections (migration cruft)

Files created/updated:
- `<path>` — <N> lines (new)
- `<path>` — <N> lines (appended)

Conflicts left for you (<N>):
- <short label>: `<variant A>` vs `<variant B>` — both kept, differs in <dimension>

[If a real CLAUDE.md was found:]

Note: project root contains a real CLAUDE.md file (not a symlink). Modern agents (Claude Code,
Codex CLI, OpenCode) all read AGENTS.md. Consider merging CLAUDE.md content into AGENTS.md and
deleting CLAUDE.md as a separate manual step.
```

---

## What this skill does NOT do

- Does **not** modify anything in `.datamitsu/`. That directory is gitignored and regenerated by
  `datamitsu` itself. The chunks are read-only from this skill's perspective. Optimizing the shared
  chunks themselves is a different task with a different risk profile and is not this skill's job.
- Does **not** resolve conflicts on its own. Two plausible variants of a command are reported, never
  silently reconciled.
- Does **not** summarize. It normalizes under the invariants above — a summarizer is allowed to lose
  detail, and this is not.
- Does **not** touch symlinks like `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`. They
  reflect `AGENTS.md` automatically.
- Does **not** add tracking markers, version numbers, or state files. The chunks are the source of
  truth on every run; if a chunk grows, the next run picks it up.
- Does **not** validate the contents of the override block. The author wrote it; the skill respects
  it.
- Does **not** modify `README.md` or `CHANGELOG.md` unless extracting content there (append only,
  never rewrites existing content).

---

## Edge cases

**No `AGENTS.md` in project root.** Abort with message: "No AGENTS.md found in project root."

**Multiple bootstrap lines.** Use the first one. Warn that subsequent ones are ignored — this is
malformed input.

**Bootstrap line points to a file outside `.datamitsu/`.** Abort. This skill is only for
datamitsu-managed projects.

**Active chunk file does not exist on disk** (`.datamitsu/` was deleted or never generated). Abort:
"Active chunk file `.datamitsu/ai/agents/agents-XXX.md` not found. Run `pnpm dm` (or your
equivalent) to regenerate `.datamitsu/`, then re-run this skill."

**`AGENTS.md` is empty or has only the bootstrap line.** Nothing to clean. Print: "AGENTS.md has no
project content beyond the bootstrap. Nothing to do." Exit cleanly.

**Pitfall span without an explicit "Known Pitfalls" parent heading.** If individual spans describe
specific bugs/footguns scattered through the file, still classify them as `pitfall` based on
content. Pitfalls are content-defined, not structurally-defined.

**A span matches a chunk rule but adds a project-specific exception.** The rule half is
`duplicate-of-chunk`; the exception half is `project-exception`. Delete the first, keep the second.

**Two spans conflict and one is obviously stale** (e.g. it names a script that no longer exists in
`package.json`). Still report it as a conflict — but say which one the repository supports, and why.
The evidence goes in the report; the decision stays with the user.

**Extraction target directory does not exist.** Create it. The skill creates `docs/architecture/`,
`docs/templates/`, etc. as needed.

**Extraction target file already exists.** Append to it — never overwrite. Add a blank line
separator and a `## <heading>` before the appended content.

**Nothing to delete, extract or merge, but rules are verbose.** That is still a valid run: propose
compaction only. Print the plan with an empty delete section.

**All spans are project-unique rules and pitfalls, already tight.** Print: "AGENTS.md is already
clean — all content is project-specific rules or pitfalls, and no span compacts without losing
meaning. Nothing to do." Exit cleanly.

---

## Interaction style

- Be terse. Reports are scannable, not narrative.
- Quote line numbers from the current `AGENTS.md` exactly.
- Quote chunk section names exactly as they appear in the chunk.
- One-line "why" justifications. Do not explain the obvious.
- Never apologize for findings. The duplicates are facts, not the author's failure.
- Report conflicts flatly, without recommending a winner unless the repository itself provides the
  evidence.
