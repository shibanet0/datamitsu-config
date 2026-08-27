## Backlog

If `docs/backlog/` exists, it holds work that was deliberately deferred — one Markdown file per
item, each written at the moment the problem was understood, by whoever had just finished
investigating it.

**Search it before you start investigating anything.** Search the bodies, not just the filenames:

```bash
rg -i "<symptom or subsystem>" docs/backlog/
```

Do this before debugging a defect, before a performance or correctness investigation, before
writing a plan, before proposing a design change, and whenever the user asks why something is the
way it is.

A hit is worth more than it looks, because of **when** it was written rather than who wrote it: at
the moment the problem was understood, while the context still existed. It may already hold the
reproduction, the measurement, the approach that was tried and failed, or the constraint that rules
out the obvious fix. Re-deriving that costs hours; reading it costs a minute.

A hit also **re-opens the triage decision**, it does not close it. `worth: later` and `worth: no`
were judgments made under the circumstances of the `added:` date. Circumstances change — the thing
that was not worth fixing when it cost one user a second a week may be worth fixing now that it
costs a build ten minutes. Read the reasoning, check whether its premises still hold, and say so
rather than silently inheriting the old verdict.

Treat an entry as evidence, not as truth: verify its `where:` anchor before relying on it, because
the code may have moved since.

### Where a finding goes

Three places, and they are not interchangeable. Put a finding in exactly one:

| Place                | Holds                                                               | Test                                              |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `AGENTS.md`          | A rule a contributor must follow to work correctly **now**          | Not knowing it makes you do the wrong thing today |
| `docs/backlog/`      | Work on this repository that was deliberately deferred              | Somebody could pick it up and act on it           |
| Agent-private memory | How **this user** works — preferences, corrections, session context | It is about the person, not the codebase          |

"`pnpm test` needs `umask 022` here" is an `AGENTS.md` rule: it changes what you do right now. "The
store grows without bound" is a backlog entry: it is broken, nobody is fixing it today, and someone
could. "The user prefers short commit messages" is neither — it belongs to agent memory and must
never be committed.

**The backlog is not a notebook.** It is not a place to park session notes, observations, ideas you
have not examined, or anything an agent wants to remember. Every entry is a claim that something
about this codebase is wrong or missing and that acting on it is possible. If a note fails that
test, it does not become a backlog entry just because it has nowhere else to go.

The reverse matters too: a real finding must not be left in agent-private memory, where the next
contributor, the next agent and CI will never see it. Private memory is per-machine and per-client;
the repository is what everyone reads.

The `backlog` skill holds the format and the workflow.
