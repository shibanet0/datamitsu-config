---
name: compact-agent-chunk
description: Compact the shared agent-rule chunks in agents-md-chunks/ — find duplicates across layers and inside a single chunk, drop rationale and examples that change no behavior, move a rule to the narrowest layer that needs it, and shrink wording — without losing a rule, condition, exception, obligation or exact literal. Use whenever the user asks to compact, shrink, deduplicate, audit or reduce the token cost of the shared AGENTS.md chunks, the agent rules, or agents-md-chunks/ — including "the base chunk is too big", "every repo pays for this", "dedupe the agent rules", "audit 00-*". This is the repo-local counterpart to the shipped cleanup-agents-md skill, which cleans a *consuming project's* AGENTS.md against these chunks and treats them as read-only.
---

# Compact Agent Chunk

This skill optimizes the **shared agent rules at their source** — the Markdown files in
`agents-md-chunks/`. Those files are concatenated into `src/datamitsu-config/agents.md.ts` and
deployed by `datamitsu` into every consuming repository as `.datamitsu/ai/agents/agents-*.md`, where
they sit in an agent's context on every single turn.

It is deliberately **not** shipped in `skills-chunks/`. A consuming repository only ever holds the
regenerated copies under `.datamitsu/`, which are gitignored and overwritten on the next `dm init` —
there is nothing there worth editing. The sources exist only here.

## Why the risk profile is different

The shipped `cleanup-agents-md` skill has an escape hatch: the chunk is the source of truth, so
deleting a project rule is safe when the chunk still guarantees it. **Here there is no such
authority.** These files _are_ the authority. Anything deleted here is deleted for everyone, and:

- A mistake propagates to every consuming repository on the next release, not just one.
- Consumers cannot patch it locally — `.datamitsu/` is regenerated, so a local fix is erased.
- The blast radius is every agent turn in every repository, silently.

So: this skill proposes and waits. It writes nothing without explicit confirmation, and it aborts
rather than guess.

---

## Scope

**Editable:** `agents-md-chunks/*.md` — nothing else.

**Regenerated, never hand-edited:** `src/datamitsu-config/agents.md.ts`. It carries build-time
sha256 hashes; editing it by hand puts them out of sync with the chunks.

**Out of scope:** `skills-chunks/` (skills are read on invocation, not every turn — a different cost
model and a different skill), anything under `.datamitsu/`, and any consuming repository's
`AGENTS.md`.

---

## The layering model

`scripts/gen-agents-md.ts` builds the deployed variants from the filename prefix. Read it if the
layout has changed; as of writing:

- Files are sorted **by filename**, so within a layer the order is alphabetical
  (`00-backlog.md` precedes `00-base.md`).
- `AGENTS_BASE` = every chunk at the **minimum** prefix (`00-*`).
- The **maximum** prefix (`20-*`) is terminal: each `20-*` chunk produces one variant made of
  _every chunk below max_ plus itself. So `AGENTS_DOCS_MARKDOWN` = all `00-*` + `10-docs` +
  `20-docs-markdown`.

The consequence that drives every decision here:

| Layer  | Reaches                        | Cost                                  |
| ------ | ------------------------------ | ------------------------------------- |
| `00-*` | **Every** consuming repository | Paid on every turn, everywhere        |
| `10-*` | Only the docs variants         | Paid only by repositories that opt in |
| `20-*` | One docs variant each          | Paid by the narrowest audience        |

A line in `00-*` is the most expensive line in this repository. A line in `20-*` is among the
cheapest. **Moving a rule down a layer is usually worth more than any amount of rewording** — but it
also changes who receives it, which makes it a behavior change, not a compaction (see
`layer-move` below).

---

## Step 1 — Measure first

Before proposing anything, establish the baseline so the proposal can be judged:

```bash
wc -l agents-md-chunks/*.md
```

Report per chunk: line count, approximate word count, and which deployed variants include it. Name
the largest `00-*` chunks explicitly — that is where the money is.

If the user named a specific chunk, still read **all** of them: cross-chunk duplication is the
single most common finding and it is invisible from inside one file.

---

## Step 2 — Atomize

Break every chunk down the same way the shipped skill does:

```text
Chunk file
  → sections (## headings)
    → semantic spans      (a contiguous run of lines that says one thing)
      → atomic statements (one rule, one condition, one exception, one example)
```

Assign each span a role — `rule`, `condition`, `exception`, `rationale`, `example`, `descriptive`,
`literal` — and record two things for every `rule`:

**Normative strength**, which is part of the meaning and may be neither weakened nor strengthened:

```text
NEVER / MUST NOT  >  MUST / ALWAYS  >  SHOULD  >  PREFER  >  MAY  >  descriptive
```

**Exact literals**, recorded verbatim: commands and their exact shape, paths, flags, script names,
package names, identifiers, config keys, versions, environment variable names. `pnpm exec dm check`
and `pnpm dm check` are different strings — never reconcile two variants from memory.

---

## Step 3 — Compare across chunks, then inside each

**Across chunks (do this first).** Two spans in different chunks that both land in the same deployed
variant are a duplicate the consumer actually pays for twice. Check every variant, not just
`AGENTS_BASE`.

**Inside one chunk.** The same rule stated in an intro paragraph and again in a checklist is one
rule; the checklist entry and the intro are not automatically the same rule, though — verify.

Categories:

| Category                     | Definition                                                      | Action                                 |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| `cross-chunk-duplicate`      | Same rule in two chunks that share a deployed variant           | Keep one, in the broader layer         |
| `internal-duplicate`         | Same rule twice inside one chunk                                | Merge into one canonical spot          |
| `internal-partial-duplicate` | Overlaps another span but adds a condition or exception         | Merge, keeping every condition         |
| `complementary`              | Refines another span rather than repeating it                   | Keep both                              |
| `potential-conflict`         | Similar but differs in a way you cannot resolve                 | Keep both, report                      |
| `misplaced-layer`            | Rule only matters to a narrower audience than its layer reaches | Propose a `layer-move`                 |
| `rationale` / `example`      | Explains or illustrates a rule already stated                   | Drop unless it resolves ambiguity      |
| `descriptive`                | Describes how something works; prescribes nothing               | Propose deletion, with the text quoted |

**Duplicate is not complementary.** "Run tests before finishing" and "run integration tests when
infrastructure changed" are not one rule — merging them into "run tests" deletes a condition.

### Similarity is not equivalence

Two statements are duplicates only if you can _demonstrate_ they mean the same thing. They are not
duplicates if they differ in any of: command literal, path, flag, package name, scope, condition,
exception, negation, or normative strength. When you cannot prove equivalence, keep both and report
a `potential-conflict`. Never pick a winner between two plausible command spellings.

### Cross-references

Chunks reference each other by section name ("see the Backlog section", "see the Privacy and
Attribution section of the shared agent rules"). Before deleting, renaming or moving a section,
search for references to it:

```bash
rg -n "<section name>" agents-md-chunks/ skills-chunks/
```

`skills-chunks/` is included on purpose: shipped skills point at chunk sections by name, and a
rename here silently breaks a pointer there. Report any reference you would break — fixing the skill
side is a separate, explicit decision.

---

## Step 4 — Compact what stays

Same policy as the shipped skill:

1. Keep every unique prescriptive rule.
2. Keep its normative strength.
3. Keep scope, conditions, exceptions and negations.
4. Keep exact literals verbatim.
5. Drop rationale that does not change how the rule is interpreted.
6. Reduce rationale to one short clause when it is what removes an ambiguity.
7. Drop examples that only restate a rule that is already unambiguous.
8. Keep a minimal example when it is the actual syntax or behavior contract.
9. Merge only semantically equivalent statements.
10. Never merge statements because they use similar words.

Order of optimization — each step shrinks the input to the next:

1. Cross-chunk duplicates.
2. Internal duplicates.
3. Descriptive content that prescribes nothing.
4. Redundant rationale.
5. Redundant examples.
6. Wording of retained rules.
7. Grouping related rules.
8. Only then formatting and line count.

**Never optimize by** removing project-specific behavior, scope, conditions, exceptions or
negations; changing `MUST` / `SHOULD` / `PREFER` / `NEVER`; changing an exact command, path, flag or
identifier; or guessing between conflicting variants.

### Protected content

- **The override paragraph** at the top of `00-base.md` — the bold sentence establishing that
  instructions above the reference override matching rules here. It is the contract every consuming
  `AGENTS.md` depends on. Never reword it.
- Any bad/good example pair that _defines_ what compliance looks like — the pair in `00-privacy.md`
  showing how to anonymize a measurement, for instance. These read like examples but carry the
  rule's operative content.
- Markdown that other tooling parses by shape rather than by prose.

---

## Step 5 — Layer moves are behavior changes

Moving a rule from `00-*` to `10-*` or `20-*` removes it from every repository that does not opt
into that layer. That is a **policy decision, not a compaction**, and it is often the right one — it
is also the only change here that can silently drop a rule from a repository that needed it.

Rules:

- Never bundle a `layer-move` in with the compaction changes. It gets its own section in the
  proposal and its own yes/no.
- State explicitly who stops receiving the rule.
- If the rule is even arguably general, leave it in `00-*` and say why you considered moving it.

---

## Step 6 — Coverage audit

Run this **before writing anything**. Every atomic prescriptive statement across all chunks must map
to exactly one disposition:

```text
Original atomic rule
  → retained (possibly reworded)
  → normalized into rule X
  → merged into equivalent rule X
  → moved to chunk Y (layer-move, separately confirmed)
  → reported as a conflict
```

There is no valid disposition "disappeared". Then check literals: every literal recorded in Step 2
appears verbatim in the result or in a reported conflict.

**If either check fails, abort before touching a file** and name the statement or literal with no
disposition.

---

## Step 7 — Propose

```text
## Chunk compaction plan

Chunks: <N> files, <K> lines
AGENTS_BASE: <N> chunks, <K> lines — reaches every consuming repository

### Cross-chunk duplicates

1. "<rule>" — `<chunk A>` (lines a-b) and `<chunk B>` (lines c-d)
   Both reach: <variants>
   Keep in: `<chunk>` — <why that one>

### Internal duplicates

2. `<chunk>` lines a-b + lines c-d → one statement at <location>
   Conditions preserved: <the distinct conditions that survive>

### To compact

3. `<chunk>` "<heading>" (lines a-b) → ~<n> lines
   Dropping: <rationale / examples>
   Preserved: <modality, literals, conditions, exceptions>

### To delete (descriptive, prescribes nothing)

4. `<chunk>` (lines a-b)
   > <the text, quoted in full so the user can judge it>

### Layer moves (behavior change — separate confirmation)

5. "<rule>" — `00-x.md` → `20-y.md`
   Stops reaching: <which repositories>
   Why it is safe: <argument>

### Potential conflicts (no change made — your call)

6. **<short label>**
   A: `<variant A>` — `<chunk>` line a
   B: `<variant B>` — `<chunk>` line b
   Differs in: <literal | scope | condition | exception | negation | normative strength>

### Broken cross-references

7. Renaming/removing "<section>" breaks <N> pointer(s):
   - `skills-chunks/<skill>/instructions.md:<line>`

---

Summary

Semantic rules before:        <R>
Semantic rules after:         <R'>
Unique rules removed:         0
Cross-chunk duplicates:       <N>
Internal duplicates merged:   <N>
Rationale/examples dropped:   <N> spans
Layer moves proposed:         <N>
Conflicts needing a decision: <N>

AGENTS_BASE (secondary):      <K> → ~<K'> lines
Per-variant (secondary):      <variant>: <K> → ~<K'>

Apply? Reply: yes / compaction only / no / show diff
```

**`Unique rules removed` must be 0.** If it is not, the analysis is wrong — do not offer to apply.

`compaction only` means: apply everything except the layer moves.

---

## Step 8 — Apply

After explicit confirmation:

1. Edit `agents-md-chunks/*.md`, bottom to top within each file.
2. Apply confirmed layer moves — remove from the source chunk, insert into the target chunk at a
   position that respects the surrounding structure.
3. Regenerate — never hand-edit the output:

```bash
node scripts/gen-agents-md.ts
```

4. Verify:

```bash
pnpm datamitsu check agents-md-chunks/
git diff --stat
```

The regenerated `src/datamitsu-config/agents.md.ts` will show changed chunk contents and changed
`_HASH` constants. Both are expected; a hash changing with no corresponding chunk edit is not, and
means something else touched the file.

5. Re-read each edited chunk and confirm every literal recorded in Step 2 is still present. Report
   immediately if one is not — the pre-run state is still in git.

**Do not commit.** Write the files, report, and stop. Committing is the user's call.

---

## Interaction style

- Terse. Quote line numbers and chunk filenames exactly.
- Quote deleted `descriptive` text in full — the user cannot judge a deletion from a summary.
- Report conflicts flatly, without recommending a winner unless the repository provides evidence.
- Lead the summary with rules preserved, not with lines removed. "Cut 40%" is not the result; "cut
  40% and every rule survived" is.
