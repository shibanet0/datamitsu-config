## Backlog

If `docs/backlog/` exists, it holds deliberately deferred work, one Markdown file per item, written by whoever finished investigating when the problem was understood.

**Search it before you start investigating anything.** Search the bodies, not just the filenames:

```bash
rg -i "<symptom or subsystem>" docs/backlog/
```

Search before debugging defects, investigating performance or correctness, writing plans, proposing design changes, or answering why something is the way it is. An entry may contain reproduction, measurement, failed approaches, or constraints ruling out obvious fixes.

A hit **re-opens triage**; it does not settle it. `worth: later` and `worth: no` reflect circumstances on the `added:` date. Read the reasoning, check whether its premises still hold, and state that rather than silently inheriting the verdict.

Treat entries as evidence, not truth. Verify each `where:` anchor before relying on it; code may have moved.

### Where a finding goes

Use exactly one of these three non-interchangeable places:

| Place                | Holds                                                               | Test                                              |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `AGENTS.md`          | A rule a contributor must follow to work correctly **now**          | Not knowing it makes you do the wrong thing today |
| `docs/backlog/`      | Work on this repository that was deliberately deferred              | Somebody could pick it up and act on it           |
| Agent-private memory | How **this user** works — preferences, corrections, session context | It is about the person, not the codebase          |

Never commit agent-private facts. Do not leave real findings in private memory, where contributors, agents, and CI cannot see them.

**The backlog is not a notebook.** Do not park session notes, observations, unexamined ideas, or anything an agent merely wants to remember. Each entry claims that something in this codebase is wrong or missing and actionable. If a note fails that test, do not add it just because it has nowhere else to go.

The `backlog` skill holds the format and the workflow.
