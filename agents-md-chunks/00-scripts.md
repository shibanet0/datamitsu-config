## Project Scripts

Every package, regardless of language, exposes the relevant standard commands through `package.json`. Before designing, changing, or reviewing package commands, build or generation steps, test scope or budgets, hook checks, or Taskfile/Turbo orchestration, read the [project scripts contract]({{projectScriptsProjectPath}}) from the project root. This includes requests to speed up CI or pre-push checks. You need not load it merely to run an existing command.

- Run `pnpm dm check` after each task. `test` runs the complete main unit/integration suite in scope. Report subsets as subsets: `test:fast`, affected-package filters, and hooks do not replace full verification. Do not silently skip tests when prerequisites are missing.
- Treat committed generated files as build inputs. Never refresh them implicitly during build, dev, or install; if missing, fail with the explicit refresh command.
- Script names do not authorize side effects. Never hide production startup, migrations, packaging, signing, or publication behind ordinary dev or build commands. Generation does not stage, commit, or push.
