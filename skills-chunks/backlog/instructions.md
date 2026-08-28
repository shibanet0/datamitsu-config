# Backlog

Deferred work lives in `docs/backlog/`, one Markdown file per item, tracked in git alongside the
code it describes.

A backlog entry is what you write when you **stumble over something real and decide not to fix it
now**: a defect nobody has time for, a design that has drifted, an idea worth keeping. It is not a
plan. A plan (`docs/plans/`) is a sequence of tasks somebody is about to execute; a backlog entry
is a note to whoever arrives next, and its job is to stop the same finding from being rediscovered,
re-argued, and re-forgotten.

Writing one costs a minute. Not writing one costs the next person the whole investigation.

---

## Search it before you start

The backlog is worth more as a **thing you read** than as a thing you write. What makes an entry
valuable is _when_ it was written, not who wrote it: at the moment the problem was understood,
while the context that made it understandable still existed. That context is the expensive part,
it does not survive, and it sits in a directory nobody thinks to open.

Search before investigating a defect, before a performance or correctness investigation, before
writing a plan, before proposing a design change, and whenever the user asks why something is the
way it is:

```bash
rg -i "<symptom>" docs/backlog/           # matching lines — read these, they are the point
rg -i "<subsystem or file>" docs/backlog/
rg -il "<term>" docs/backlog/             # just the filenames, when a term hits everywhere
ls docs/backlog/                          # the slugs alone are a table of contents
```

`rg`, not `grep`: the two take different flags, `grep` is aliased on many machines, and ripgrep
recurses by default (no `-r`). If `rg` is genuinely unavailable, `grep -ri` is the equivalent — but
say which one you used, because a search that silently found nothing because of a flag is worse
than no search.

Read the **matching lines**, not just the filenames. The slug names one symptom; the body may
mention the same subsystem for a different reason, and that is often the useful hit — which is why
the plain form comes first and `-l` is the fallback for a term that matches everything.

### What a hit gives you

- **The investigation, already done.** A reproduction, a measurement, the approach that was tried
  and abandoned, the constraint that rules out the obvious fix. Re-deriving it costs hours.
- **A triage decision that is re-opened, not settled.** `later` and `no` were judgments made under
  the circumstances of the `added:` date. Circumstances change: a cost nobody noticed at 1,000
  files matters at 50,000; a fix blocked on an unreleased dependency stops being blocked once it
  ships. Read _why_ it was deferred and check whether that reason still holds.
- **A dead end worth respecting.** A `no` that explains itself saves you from re-arguing a finding
  that was already argued.

### What to do with a hit

1. **Verify the anchor.** The `where:` line may point at code that has since moved. If it has, say
   so — the entry is evidence, not truth, and a stale anchor changes how much of it to trust.
2. **Tell the user you found it**, with the `added:` date and the current `worth:`. Do not assume
   they know it exists — an entry may predate the current conversation by a year, and whether a
   person or an agent wrote it says nothing about whether it is still right.
3. **Say whether the triage still holds.** If the premise behind a `later` or a `no` has expired,
   name that explicitly rather than quietly proceeding as if the old verdict were binding, and
   propose re-triaging it.
4. **Fold its content into your work.** If you are writing a plan, the entry's measurements and
   dead ends belong in the plan's context section, with the entry named as their source.
5. **Sharpen the entry** if your work turned up detail it lacks, even when you are not fixing it.

A search that finds nothing costs seconds. A search skipped can cost a day spent rediscovering
something already written down.

---

## The format

`docs/backlog/<slug>.md`, where the slug names **the symptom, not the fix** — someone scanning the
directory should recognize a problem they have hit.

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

| Field   | Meaning                                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worth` | `yes` — agreed worth fixing, unscheduled. `later` — the _value_ is undecided; the body must name what is unknown. `no` — decided against; the body must say why, so it is not re-argued. |
| `where` | Optional anchor, `path:line`. Omit when the item is not tied to one place.                                                                                                               |
| `added` | Creation date, `YYYY-MM-DD`. **Never modified** — its age is the signal.                                                                                                                 |

`worth` is a judgment about **value**, not urgency and not effort. An item that is clearly worth
fixing but will take a week is still `yes`.

### Body

Prose, not checklists. Short — a reader should absorb it in under a minute. Include a measurement
if one exists; a number is what turns "this feels slow" into something actionable later. Link to a
PR or issue if one exists.

Do not write an implementation plan. If the item is well-understood enough to plan, it does not
belong in the backlog — write the plan instead.

---

## Lifecycle

Entries are created as part of whatever work uncovered them, and deleted by `git rm` **in the same
commit as the work that resolves them**. The deletion is the record that it was done; git history
holds the rest. Do not add a `status: done` field and leave the file behind.

An item dropped as no-longer-relevant is removed the same way, with the reasoning in the commit
message.

---

## When not to write an entry

A backlog nobody reads is worse than no backlog: it also creates the false impression that
everything is written down. Every entry costs a reader attention, so the bar is that somebody could
pick it up and act on it.

Do not create an entry for:

- **Something you are fixing now.** Fix it. The commit is the record.
- **A preference.** "I would have structured this differently" is not a defect.
- **An unexamined hypothesis.** If you have not checked it, you are asking the next reader to do
  the investigation twice. Check it, or say plainly in the body that it is unverified and what
  would verify it.
- **Something already tracked** in an issue tracker or another entry. Link or sharpen instead.
- **A note to yourself.** Session context, user preferences and reminders belong to agent-private
  memory, not to a file every contributor pulls. The backlog is about the codebase, not about the
  work session.
- **Something understood well enough to plan.** That is a plan (`docs/plans/`), not a backlog entry.

If it does not clear the bar and you still think it matters, say so to the user rather than
committing it.

---

## Creating an entry

0. **Create `docs/backlog/` if it does not exist.** No README, no index — the directory listing is
   the table of contents, and an index file goes stale the first time somebody forgets it.
1. **Check for a duplicate first.** Match on the slug _and_ on `where`. If an entry already covers
   it, sharpen that one rather than adding a second — a backlog with two entries for one defect is
   how a backlog stops being read.
2. **Verify the anchor.** If you write `where: path:line`, open it and confirm the line still says
   what you claim. A stale anchor is worse than none.
3. **Pick `worth` honestly.** If you cannot tell whether it is worth fixing, that is `later`, and
   the body must say what would settle it.
4. **Apply the privacy rules.** Backlog entries are published. Measurements from a private
   repository keep their shape and lose their identity; another project is not named without
   explicit permission. See the Privacy and Attribution section of the shared agent rules.
5. **Do not commit unasked.** Write the file and report it. Committing is the user's call unless
   they have said otherwise.

---

## Working an entry

When asked to work on a backlog item, before touching anything:

1. Read the file and **verify the anchor still holds**. If the code moved, say so — the entry may
   be stale, and re-deriving it is part of the job.
2. Report four things, briefly: what it is, roughly what it takes, what it touches, and whether it
   still matters.
3. Ask what to do with concrete options — fix it now, re-triage it (`worth` changed), sharpen the
   entry, or drop it.

Only then start. When the work lands, `git rm` the entry in the same commit.

Working several items at once: verify every anchor first, name any ordering constraints between
them, then take them one at a time with visible progress. Re-verify immediately before each change
— an earlier item may have moved the code a later one points at. Run the project's tests and
linters as usual. Never commit automatically.

---

## Branch safety

Before writing or removing an entry, check the current branch against the repository's default
branch. If they differ, confirm with the user first — a backlog edit stranded on a feature branch
is invisible to everyone else, and one committed to the default branch by accident is noise in
someone's history.
