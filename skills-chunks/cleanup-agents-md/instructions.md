# Cleanup AGENTS.md

Clean up the project's `AGENTS.md` in two stages:

1. Remove rules guaranteed by shared chunks deployed via [datamitsu](https://datamitsu.com/) to `.datamitsu/ai/agents/agents-*.md`. Move non-rule content (architecture docs, templates, release notes) to its own file.
2. Compact the rest without changing agent behavior.

Shared chunks are authoritative. Keep only project-specific prescriptive content in `AGENTS.md`, not chunk duplicates. Document internals in dedicated docs, not `AGENTS.md`.

Minimize tokens, not lines. Losing even one unique rule, condition, exception, exact literal or degree of obligation fails the cleanup.

Rewriting `AGENTS.md` and creating files are destructive: propose → confirm → apply. Never apply without explicit confirmation.

---

## Invariants

At every step, report rather than violate an invariant.

1. **No silent rule loss.** Give every original prescriptive statement an explicit disposition (Step 6).
2. **No silent conflict resolution.** Without proven equivalence, report similar but different statements; never merge them or pick a winner.
3. **Normative strength is preserved.** `NEVER` does not become `avoid`; `prefer` does not become
   `always`.
4. **Exact literals are preserved.** Commands, flags, paths, package names, identifiers, config keys
   and versions are never rewritten from memory, "corrected", or normalized.
5. **The chunk is read-only.** Nothing under `.datamitsu/` is modified, ever.
6. **Project exceptions survive.** A rule extending or contradicting a chunk rule belongs in `AGENTS.md`; it is not a duplicate.
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

Use sections for structure and reporting, not decisions (Step 3).

---

## Step 3 — Atomize

Classify below section level: one section can mix rules, architecture, rationale, examples, project exceptions and chunk duplicates requiring different actions.

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

Modality tiers are not interchangeable:

```text
NEVER / MUST NOT  >  MUST / ALWAYS  >  SHOULD  >  PREFER  >  MAY  >  descriptive
```

Record each `rule` span's tier. Never weaken or strengthen it.

> `Prefer X.` is not `Always use X.`
> `Never bypass commit hooks.` is not `Do not normally bypass commit hooks.`

### Exact literals

Record every literal verbatim: commands and their exact shape, paths, flags, script names, package
names, identifiers, config keys, versions, environment variable names, and any `<!-- hits: N -->`
markers.

`pnpm exec dm check` and `pnpm dm check` differ. Never improve literals from memory or reconcile variants. Report suspected errors as conflicts; do not fix them.

---

## Step 4 — Classify each span

Assign exactly one category per span. A section can yield deletions, extractions and retained rules.

### Against the chunk

| Category              | Definition                                                | Action                         |
| --------------------- | --------------------------------------------------------- | ------------------------------ |
| `duplicate-of-chunk`  | Semantically covered by a rule in the active chunk        | Delete                         |
| `project-unique-rule` | Prescriptive rule specific to this project, not in chunks | Keep semantics (Step 5)        |
| `project-exception`   | Extends or contradicts a chunk rule for this project      | Keep; never treat as duplicate |

Do not use the old section-level `partial-duplicate` category. Classify mixed sections span by span: `duplicate-of-chunk` or kept.

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

Duplicates require proven equivalence. Any difference below rules it out:

- command literal · path · flag · package name
- scope · condition · exception · negation
- normative strength

If context cannot establish which differing span is correct, classify both as `potential-conflict`:

```text
pnpm exec dm check
pnpm dm check
```

These commands resolve differently. Keep both spans in place, list them under **Potential conflicts** in the proposal and let the user decide. Never canonicalize without sufficient grounds.

### Classification rules

**Compare semantics, not wording.** Identical intent and content make a chunk duplicate.

**Distinguish description from prescription, regardless of length.** A retry orchestrator's internals are `architectural-detail`; "always call `markRetryHealthyBoot` after a successful boot, otherwise X" is a `project-unique-rule`.

**Pitfall detection.** A span is a `pitfall` if any of these match:

- Its heading contains: `Pitfall`, `Known Pitfalls`, `Known Issues`, `Pitfalls`,
  `Gotcha`, `Common mistakes`, `Lessons learned`
- It belongs to a parent section matching those patterns
- It describes a specific bug, race, footgun, or mistake to avoid in this codebase
- It contains `<!-- hits: N -->` markers — these are project state and must be preserved exactly

**Deferred work vs pitfall:** Does the reader need to act differently today?

- A **pitfall** explains how to avoid a failure: "`pnpm test` must run with `umask 022` or the source-mode tests fail on the test binary's own mode."
- **Deferred work** records an unfixed defect without changing current behavior: "The store grows without bound; every config-hash change orphans a directory."

Markers of `deferred-work`: "TODO", "FIXME", "not implemented yet", "should eventually", "known
limitation", "we plan to", a described bug with no workaround given.

Never delete these items. Move each to its own file in `docs/backlog/` using the `backlog` skill's format. If unsure between `pitfall` and `deferred-work`, keep the pitfall in `AGENTS.md`.

**Keep only context needed to interpret later rules.** "This repository contains the CLI and its documentation website" helps if rules refer to "CLI" and "website". Extract unnecessary context regardless of length: a mission statement, repo tree, full package catalog, dependency list or non-prescriptive architecture overview.

**Migration cruft detection.** A section is `migration-cruft` if:

- Heading is "Migrated From CLAUDE.md", "From CLAUDE.md", or similar migration-provenance heading
- It contains only a child `# CLAUDE.md` heading and/or boilerplate like "This file provides
  guidance to Claude Code (claude.ai/code)..." with no prescriptive rules
- It wraps other sections that would otherwise be top-level — the wrapper itself is cruft, the
  wrapped content is classified independently

When stripping migration cruft: remove the wrapper heading and any boilerplate lines. Promote
wrapped subsections one heading level up (e.g., `###` under `## Migrated From CLAUDE.md` becomes
`##`). Preserve all prescriptive content inside.

**Misplaced overrides.** Below the bootstrap, classify explicit extensions or contradictions of chunk rules (e.g., "in this fork, commits follow the upstream format, not Conventional Commits") as `project-exception`. Note: "Consider moving to override block above bootstrap line".

**When unsure** between `duplicate-of-chunk` and `project-unique-rule`, keep `project-unique-rule` rather than risk deleting project content.

**Only deletion is irreversible.** Delete only `duplicate-of-chunk`: the rule survives in the chunk. If no category fits, relocate rather than delete (e.g., to docs, `CHANGELOG.md` or `docs/backlog/`) and report the destination.

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

For an existing target, append under a new `## <original heading>`.

---

## Step 5 — Compact what is retained

`Keep` protects meaning, not wording. Shorten, normalize, merge equivalent local rules or group related rules only if scope, modality, conditions, exceptions and exact literals survive.

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

This keeps `never`, `process.env` and the scope (outside the env module); the rationale does not affect behavior.

### Order of optimization

Always optimize in this order:

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

`Keep pitfall` permits compaction to:

```text
trigger/context → failure mode → required action
```

For example, replace discovery history with:

```text
- Before closing the DB, stop the checkpoint worker; otherwise shutdown races the WAL checkpoint.
```

Only omit history that does not affect behavior. Preserve `<!-- hits: N -->` markers exactly; they are project state.

### Wholesale restructuring is out of scope

Group related rules under one heading (optimization step 7), but do not restructure wholesale. Keep section order stable unless a section becomes empty.

---

## Step 6 — Coverage audit

Audit **before writing anything**.

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

**If either check fails, abort before touching any file.** Report the unmapped statement or literal.

---

## Step 7 — Propose

Present the proposal in this exact format. Do not apply yet.

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

**`Unique rules removed` must be 0.** Otherwise do not offer to apply. Return to Step 6, find the unmapped statement and fix its classification.

- `show diff`: Print the unified diff from the current `AGENTS.md` to the planned result and the content of each new file. Ask again.
- `no`: Abort without modifying anything.
- `yes`: Proceed to Step 8.

---

## Step 8 — Apply

After explicit `yes`:

1. **Create extraction target files first.** For each extracted span:
   - Create parent directories if needed.
   - If the target file is new, write a `# <heading>` title and the extracted content.
   - If the target file exists, append `\n\n## <heading>\n\n` + content at the end.
2. **Write backlog entries.** Create `docs/backlog/` if needed. For each `deferred-work` item, follow the `backlog` skill: one file, symptom slug, `worth`/`where`/`added` frontmatter, `added` set to today. Move the original wording without summarizing; anonymize quoted private paths or references to another project per the privacy rules.
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

Do not create backups. Rely on the user's pre-run git commit; do not abort at this stage if they skipped it.

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

- Never modify `.datamitsu/`: gitignored, read-only chunks regenerated by `datamitsu`. Shared chunk optimization is a separate task.
- Never resolve conflicts independently. Report plausible command variants; do not reconcile them.
- Normalize under the invariants; do not summarize or lose detail.
- Leave symlinks like `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules` untouched; they reflect `AGENTS.md` automatically.
- Do not add tracking markers, version numbers or state files. Use current chunks as the source of truth each run.
- Do not validate the author's override block.
- Modify `README.md` or `CHANGELOG.md` only to append extracted content; never rewrite existing content.

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

**No "Known Pitfalls" parent heading.** Classify scattered, codebase-specific bugs or footguns as `pitfall` by content.

**A span matches a chunk rule but adds a project-specific exception.** The rule half is
`duplicate-of-chunk`; the exception half is `project-exception`. Delete the first, keep the second.

**One conflicting span is clearly stale** (e.g., its script is absent from `package.json`). Still report the conflict. State which variant the repository supports and why; leave the decision to the user.

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
