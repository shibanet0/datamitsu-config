# Cleanup AGENTS.md

You are about to clean up the project's `AGENTS.md` by removing sections that are already covered by the shared chunks deployed via [datamitsu](https://datamitsu.com/) into `.datamitsu/ai/agents/agents-*.md`, and by extracting non-rule content (architecture docs, templates, release notes) to separate files where it belongs.

The shared chunks are the **source of truth**. The project's `AGENTS.md` should contain only what is specific to this project and not covered by the chunks. Additionally, `AGENTS.md` is for **prescriptive rules** — descriptive documentation of internals belongs in dedicated docs files, not in agent instructions.

This skill is destructive — it rewrites `AGENTS.md` and may create new files. Always follow the propose → confirm → apply order. Never apply without explicit confirmation.

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
   > This project's `AGENTS.md` does not reference any datamitsu chunk. This skill only works with datamitsu-managed projects. Aborting.

If `CLAUDE.md` exists in the project root **as a real file** (not a symlink to `AGENTS.md`), note it and report at the end — do not auto-merge.

Survey the project structure to determine extraction targets:

- Does `docs/` exist? If so, note subdirectories (e.g., `docs/architecture/`, `docs/guides/`, `docs/templates/`).
- Does `CHANGELOG.md` exist?
- Note the project name and purpose from `package.json`, `README.md`, or similar.

---

## Step 2 — Parse the project AGENTS.md

Identify three regions in this exact order:

1. **Override block** — everything between the `# AGENTS.md` heading and the bootstrap line. May be empty. Project-specific overrides of chunk rules live here. **Never modify.**
2. **Bootstrap line** — the one bold paragraph that references the chunk. **Never modify.**
3. **Project content** — everything below the bootstrap line. Split into sections by `##` (h2) headings. Subsections (`###` and deeper) belong to their parent section.

---

## Step 3 — Classify each project section

For each `##` section in project content, assign exactly one category:

| Category               | Definition                                                                   | Action                               |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| `duplicate-of-chunk`   | Section is semantically covered by a rule in the active chunk                | Delete from AGENTS.md                |
| `partial-duplicate`    | Part is covered, part is unique to this project                              | Rewrite to keep only unique part     |
| `project-unique-rule`  | Prescriptive rule specific to this project, not in chunks                    | Keep                                 |
| `pitfall`              | Belongs to "Known Pitfalls" / "Известные проблемы" / similar                 | Keep                                 |
| `architectural-detail` | Long descriptive documentation of a subsystem (not a rule)                   | Extract to docs file                 |
| `template-material`    | Reusable template skeleton (e.g., installation tabs, annotation boilerplate) | Extract to docs file                 |
| `release-note`         | Description of a past migration or breaking change                           | Extract to docs or CHANGELOG         |
| `migration-cruft`      | Wrapper headings/boilerplate left from a CLAUDE.md→AGENTS.md migration       | Strip cruft, integrate content       |
| `overview`             | README-style content (mission, package list, repo tree, key deps)            | Keep if ≤20 lines; extract if larger |

### Classification rules

**Semantic, not textual.** Project sections often reword chunk rules in different words. Same intent and content = duplicate, regardless of wording.

**Prescriptive vs descriptive distinguishes rule from architecture.** A 60-line description of how the retry orchestrator works internally is `architectural-detail`. A 2-line statement "always call `markRetryHealthyBoot` after a successful boot, otherwise X" is `project-unique-rule`. Length is not the criterion — the question is "does this tell the agent what to do (rule)" or "does this describe how the system works (architecture)".

**Pitfall detection.** A section is a `pitfall` if any of these match:

- Heading contains: `Pitfall`, `Known Pitfalls`, `Известные проблемы`, `Подводные камни`, `Gotcha`, `Common mistakes`, `Lessons learned`
- It belongs to a parent section matching those patterns
- It describes a specific bug, race, footgun, or mistake to avoid in this codebase
- It contains `<!-- hits: N -->` markers — these are project state and must be preserved

**Migration cruft detection.** A section is `migration-cruft` if:

- Heading is "Migrated From CLAUDE.md", "From CLAUDE.md", or similar migration-provenance heading
- It contains only a child `# CLAUDE.md` heading and/or boilerplate like "This file provides guidance to Claude Code (claude.ai/code)..." with no prescriptive rules
- It wraps other sections that would otherwise be top-level — the wrapper itself is cruft, the wrapped content is classified independently

When stripping migration cruft: remove the wrapper heading and any boilerplate lines. Promote wrapped subsections one heading level up (e.g., `###` under `## Migrated From CLAUDE.md` becomes `##`). Preserve all prescriptive content inside.

**Misplaced overrides.** If a project section explicitly contradicts or extends a chunk rule (e.g., "in this fork, commits follow the upstream format, not Conventional Commits"), it is a legitimate override — but it should live in the override block above the bootstrap line, not below. Classify as `project-unique-rule` and add a note: "Consider moving to override block above bootstrap line".

**Be conservative.** When in doubt between `duplicate-of-chunk` and `project-unique-rule`, choose `project-unique-rule`. False positive (deleting useful project content) is worse than false negative (leaving a small duplicate).

### Extraction target selection

When a section is classified for extraction, choose a target file:

1. **`architectural-detail`** → `docs/architecture/<slugified-heading>.md`. If `docs/architecture/` does not exist but `docs/` does, create it. If `docs/` does not exist, use `docs/<slugified-heading>.md`.
2. **`template-material`** → `docs/templates/<slugified-heading>.md`. Same directory creation rules.
3. **`release-note`** → append to `CHANGELOG.md` if it exists, otherwise `docs/changelog.md`.
4. **`overview`** (>20 lines) → `docs/<slugified-heading>.md` or merge into `README.md` if the content is clearly README material.

Slugify: lowercase, replace spaces with hyphens, remove special characters. E.g., "Important Implementation Details" → `important-implementation-details.md`.

If the target file already exists, append the extracted content under a new `## <original heading>` at the end of that file.

---

## Step 4 — Propose

Build a report and present it to the user. Do not apply yet.

Structure the report exactly like this:

```
## Cleanup plan for AGENTS.md

Active chunk: `.datamitsu/ai/agents/agents-XXX.md`
Project AGENTS.md: <M> sections, <K> lines

### To delete (covered by chunks)

1. **Section "<heading>"** (lines a-b)
   Covered by: chunk § "<chunk section>"
   Why: <one-line semantic summary of the overlap>

2. ...

### To rewrite (partial duplicates)

3. **Section "<heading>"** (lines a-b)
   Partially covered by: chunk § "<chunk section>"
   Keep: lines c-d (<one-line summary of the unique part>)
   Drop: lines e-f, g-h (<summary of duplicated parts>)

### To extract (non-rule content → separate files)

4. **Section "<heading>"** (lines a-b) — <category>
   Target: `<target file path>`
   Why: <one-line reason>

### To clean up (migration cruft)

5. **Section "<heading>"** (lines a-b)
   Action: <what will be stripped/promoted>
   Why: <one-line reason>

### To keep (project-unique rules and pitfalls)

6. Section "<heading>" (lines a-b) — <category>

---

Summary
- Will delete: <N> sections, ~<L1> lines
- Will rewrite: <N> sections, ~<L2> → ~<L3> lines
- Will extract: <N> sections, ~<L4> lines → <N> new/updated files
- Will clean up: <N> sections (migration cruft stripped)
- Will keep untouched: <N> sections (project-unique + pitfalls)

Files to create/update:
- `<target file 1>` (new) — <N> lines
- `<target file 2>` (append) — <N> lines
...

Total AGENTS.md: <K> → ~<K_after> lines

Apply changes? Reply: yes / no / show diff
```

If the user replies `show diff`, print the unified diff between the current `AGENTS.md` and the planned result, plus the content of each file to be created. Then ask again.

If the user replies `no`, abort. Do not modify anything.

If the user replies `yes`, proceed to Step 5.

---

## Step 5 — Apply

After explicit `yes`:

1. **Create extraction target files first.** For each extracted section:
   - Create parent directories if needed.
   - If the target file is new, write a `# <heading>` title and the extracted content.
   - If the target file exists, append `\n\n## <heading>\n\n` + content at the end.
2. **Clean up migration cruft.** Strip wrapper headings and boilerplate, promote child sections.
3. **Apply deletes and rewrites** in order from **bottom to top** of `AGENTS.md` (so line numbers don't shift mid-edit).
4. **Remove extracted sections** from `AGENTS.md` (also bottom to top).
5. Preserve everything not touched: the override block, the bootstrap line, the `# AGENTS.md` heading, all kept sections, all whitespace and section ordering elsewhere.
6. Write the result back to `AGENTS.md`.

Do not create backup files. Git is the backup. The user committed before running this — if they didn't, that's user error and aborting too late won't help.

---

## Step 6 — Report

After writing, print a final summary:

```
Done.

AGENTS.md: <K_before> → <K_after> lines (-<delta>%)
- Deleted: <N> sections (chunk duplicates)
- Rewritten: <N> sections (partial duplicates)
- Extracted: <N> sections → <N> files
- Cleaned up: <N> sections (migration cruft)

Files created/updated:
- `<path>` — <N> lines (new)
- `<path>` — <N> lines (appended)
...

[If a real CLAUDE.md was found:]

Note: project root contains a real CLAUDE.md file (not a symlink). Modern agents (Claude Code, Codex CLI, OpenCode) all read AGENTS.md. Consider merging CLAUDE.md content into AGENTS.md and deleting CLAUDE.md as a separate manual step.
```

---

## What this skill does NOT do

- Does **not** modify anything in `.datamitsu/`. That directory is gitignored and regenerated by `datamitsu` itself. The chunks are read-only from this skill's perspective.
- Does **not** touch symlinks like `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`. They reflect `AGENTS.md` automatically.
- Does **not** add tracking markers, version numbers, or state files. The chunks are the source of truth on every run; if a chunk grows, the next run picks it up.
- Does **not** validate the contents of the override block. The author wrote it; the skill respects it.
- Does **not** modify `README.md` or `CHANGELOG.md` unless extracting content there (append only, never rewrites existing content).

---

## Edge cases

**No `AGENTS.md` in project root.** Abort with message: "No AGENTS.md found in project root."

**Multiple bootstrap lines.** Use the first one. Warn that subsequent ones are ignored — this is malformed input.

**Bootstrap line points to a file outside `.datamitsu/`.** Abort. This skill is only for datamitsu-managed projects.

**Active chunk file does not exist on disk** (`.datamitsu/` was deleted or never generated). Abort: "Active chunk file `.datamitsu/ai/agents/agents-XXX.md` not found. Run `pnpm dm` (or your equivalent) to regenerate `.datamitsu/`, then re-run this skill."

**`AGENTS.md` is empty or has only the bootstrap line.** Nothing to clean. Print: "AGENTS.md has no project content beyond the bootstrap. Nothing to do." Exit cleanly.

**Pitfall section without explicit "Known Pitfalls" parent heading.** If individual sections describe specific bugs/footguns scattered through the file (not under a "Known Pitfalls" parent), still classify them as `pitfall` based on content. Pitfalls are content-defined, not structurally-defined.

**Section in project content matches a chunk rule but adds a project-specific exception.** This is `partial-duplicate`. Rewrite to keep only the exception.

**Extraction target directory does not exist.** Create it. The skill creates `docs/architecture/`, `docs/templates/`, etc. as needed.

**Extraction target file already exists.** Append to it — never overwrite. Add a blank line separator and a `## <heading>` before the appended content.

**All sections are project-unique rules and pitfalls.** Nothing to delete, extract, or clean up. Print: "AGENTS.md is already clean — all content is project-specific rules or pitfalls. Nothing to do." Exit cleanly.

---

## Interaction style

- Be terse. Reports are scannable, not narrative.
- Quote line numbers from the current `AGENTS.md` exactly.
- Quote chunk section names exactly as they appear in the chunk.
- One-line "why" justifications. Do not explain the obvious.
- Never apologize for findings. The duplicates are facts, not the author's failure.
