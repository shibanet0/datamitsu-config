# Backlog

Track deferred work in git alongside the code, one Markdown file per item in `docs/backlog/`.
Record a real finding you decide not to fix now: a defect, design drift, or an idea worth keeping.
An entry spares the next reader another investigation or debate. A plan (`docs/plans/`) lists tasks someone is about to execute.

---

## Search it before you start

Search the backlog for context captured when a problem was understood, regardless of who wrote it.
Search before investigating a defect, performance, or correctness; before writing a plan or proposing
a design change; and whenever the user asks why something is the way it is:

```bash
rg -i "<symptom>" docs/backlog/           # matching lines — read these, they are the point
rg -i "<subsystem or file>" docs/backlog/
rg -il "<term>" docs/backlog/             # just the filenames, when a term hits everywhere
ls docs/backlog/                          # the slugs alone are a table of contents
```

Use `rg`, not `grep`: flags differ, `grep` is often aliased, and ripgrep recurses by default (no `-r`).
Only if `rg` is unavailable, use `grep -ri`. Say which tool you used: a wrong flag can hide matches.

Read matching lines first. A slug names one symptom; the body may mention the subsystem for another reason.
Use `-l` only as a fallback for a term that matches everywhere.

### What a hit gives you

- **Prior investigation:** reproduction, measurement, abandoned approach, or constraint ruling out the obvious fix.
- **Triage to revisit:** `later` and `no` reflect conditions on the `added:` date. A cost at 1,000 files may matter at 50,000; a blocking dependency may have shipped. Check whether the reason for deferral still holds.
- **Known dead end:** a justified `no` need not be argued again.

### What to do with a hit

1. Verify the `where:` anchor. Report moved code: a stale reference weakens the evidence.
2. Tell the user about the entry, its `added:` date and current `worth:`. Do not assume they know it exists or judge accuracy by human or agent authorship.
3. Say whether triage still holds. If the premise for `later` or `no` has expired, say why and propose re-triage.
4. Use the findings. In a plan, put measurements and dead ends in the context section and cite the entry.
5. Add missing details your work uncovered, even if you are not fixing the item.

---

## The format

Use `docs/backlog/<slug>.md`. Name the symptom, not the fix, so readers recognize it in a listing.

```markdown
---
worth: yes | later | no
where: path/to/file.go:120
added: 2026-08-27
---

# One sentence naming the symptom

What happens, and where. Enough for a reader to find it without repeating the investigation.

Why it is not being fixed now, or what is unknown. For `later`, name the unresolved question
explicitly. For `no`, say why it was rejected.

Any direction worth preserving: a proposed approach, a measurement, a constraint that rules an
obvious fix out.

How it was found, if that context helps the next reader trust or re-check it.
```

### Frontmatter

| Field   | Meaning                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `worth` | `yes`: agreed worth fixing, unscheduled. `later`: value undecided; state the unknown in the body. `no`: rejected; explain why in the body. |
| `where` | Optional `path:line` anchor. Omit unless tied to one place.                                                                                |
| `added` | Creation date, `YYYY-MM-DD`. Never change it: age matters.                                                                                 |

`worth` measures value, not urgency or effort. A worthwhile week-long fix is still `yes`.

### Body

Write prose, not checklists, readable in under a minute. Include a measurement if available and link any existing PR or issue.
Do not write an implementation plan here. If the item is understood well enough to plan, write a plan instead.

---

## Lifecycle

Create entries during the work that uncovers them. Use `git rm` in the same commit as the resolving work.
Deletion records completion; git keeps the history. Do not retain the file with `status: done`.
Remove obsolete items the same way; explain why in the commit message.

---

## When not to write an entry

Only record findings someone can act on. An unread backlog gives a false impression of coverage.

Do not create an entry for:

- **Something you are fixing now.** Fix it. The commit is the record.
- **A preference.** "I would have structured this differently" is not a defect.
- **An unexamined hypothesis.** Check it, or state in the body that it is unverified and what would verify it.
- **Something already tracked** in an issue tracker or another entry. Link or sharpen instead.
- **A note to yourself.** Keep session context, user preferences and reminders in agent-private memory. The shared backlog describes the codebase.
- **Something understood well enough to plan.** That is a plan (`docs/plans/`), not a backlog entry.

If an excluded item still matters, tell the user instead of committing it.

---

## Creating an entry

0. Create `docs/backlog/` if absent. No README or index: the listing is the table of contents.
1. Check for duplicates by both slug and `where`. Sharpen an existing entry instead of duplicating it.
2. If supplying `where: path:line`, open it and confirm the line supports the claim.
3. Choose `worth` honestly. If value is uncertain, use `later` and state what would settle it in the body.
4. Apply the Privacy and Attribution section of the shared agent rules. Entries are published: preserve the shape of private-repository measurements, not their identity. Name another project only with explicit permission.
5. Write the file and report it. Do not commit unless the user has asked.

---

## Working an entry

When asked to work on a backlog item, before touching anything:

1. Read the entry and verify its anchor. Report moved code and re-derive stale findings.
2. Briefly report the item, rough effort, affected areas, and whether it still matters.
3. Ask the user to choose: fix now, re-triage (`worth` changed), sharpen the entry, or drop it.

Only then start. When the work lands, `git rm` the entry in the same commit.

For multiple items, verify every anchor first, identify ordering constraints, then work one at a time with visible progress.
Re-verify immediately before each change: earlier work may move later anchors. Run project tests and linters as usual. Never commit automatically.

---

## Branch safety

Before writing or removing an entry, compare the current branch with the repository's default branch.
If they differ, confirm with the user before proceeding.
