# Scaffold Preferred Stack

Propose → confirm → apply. Discovery is read-only: never install dependencies or write files before explicit confirmation.

## Read the project rules

On every run, find `## Preferred Stack` in the loaded agent rules (`.datamitsu/ai/agents/*.md`, referenced by `AGENTS.md`). Resolve its catalogue link relative to the consumer project root and open it. If the rule, link, or readable catalogue is missing, stop and identify what needs restoring. Do not reconstruct the catalogue from memory, initialize tooling, or run reconciliation.

Use the linked catalogue and loaded Version Policy, Invocation, Monorepo, and security rules. Project overrides take precedence over catalogue defaults. Keep existing non-preferred libraries unless migration was requested; note the divergence. Never introduce Tailwind or libraries built on it. If a capability is missing, label any proposed alternative as outside the catalogue and explain why.

## Identify the component and its build path

- Classify the component by what runs it, who consumes it, and what gets deployed or published. A `package.json` that delegates to another toolchain is a script wrapper, not evidence of a Node runtime.
- Find the nearest workspace that actually includes the target. Check pnpm inclusion and exclusion globs, Go module roots and `go.work` use entries, or Cargo workspace members and exclusions as applicable. Distinguish native build membership from orchestration membership. For a new path, state any membership change needed.
- Inspect a comparable package in that workspace if one exists. Trace its script through the underlying build and CI packaging or release step to the final artifact. Use that evidence for placement, commands, and outputs; flag gaps rather than inventing a pipeline.
- Preserve working local and CI invocations. Use `pnpm dm exec` only where the project's pnpm setup provides `dm`; `.datamitsu/` alone proves neither workspace membership nor command availability. Use direct `datamitsu` where appropriate. If a prerequisite is missing, identify it; do not silently bootstrap a stack.
- New monorepos must use pnpm workspaces and Turbo for the cross-package task graph. Give participating packages, including native components, thin `package.json` scripts for relevant tasks. Keep Taskfile steps package-local. Extend existing orchestration in place; do not migrate it as a side effect.

## Resolve dependencies

Preserve target declarations, pins, workspace catalog references, and peer constraints. Inspect the comparable package in the same workspace for an established compatible choice; do not align unrelated packages or search the whole repo for a version to copy.

When a new version is needed, verify against the relevant registry and choose the most recent resolvable stable release compatible with the toolchain, runtime, peers, and existing install policy (including minimum release age). Record the declaration and verified resolution. Do not guess, relax policy silently, or introduce unmaintained or EOL dependencies. If no supported choice resolves, surface the conflict rather than substituting a package or changing pins.

## Propose one plan

Apply documented defaults. Explain justified deviations in the same plan; ask only about material tradeoffs that project evidence and defaults cannot settle. Do not seek separate approvals for individual picks.

Keep the plan to the target, artifact and consumer; catalogue choices and versions with brief reasons; files, workspace wiring, invocation, and exact commands. Apply `## Single Source for Constants, Env & Build Inputs` to relevant configuration. Before proposing scripts, read the full `## Project Scripts` contract linked in the loaded rules, resolving it from the project root. Use `project-scripts` and `setup-tsconfig` guidance where applicable. For each relevant command, state its purpose, prerequisites, and side effects; name generated outputs and the refresh command for committed ones.

Include only boundaries the change affects:

- **App children:** Identify who starts, supervises, stops, and reaps them. State what guarantees cleanup on container stop or parent failure and whether, and by whom, children restart.
- **Storage:** Name the owner of persisted data, who runs migrations, and who rolls back or restores data if deployment fails.
- **API:** Trace the authoritative source to the generated or published artifact and its consumer. Name the check and a concrete breakage it detects, such as a removed field still read by that consumer.
- **Tests:** Map each proposed check to the boundary it exercises and the observable outcome, rather than listing test tools.

End with **Apply? yes / no / show details**. On `no`, stop without changes. On `show details`, show file contents and exact commands, then ask again. Script names do not authorize execution.

## Apply and report

Only after explicit `yes`, make the proposed changes and run only the approved commands. Do not create backup files, run `dm config reconcile`, or change managed configs beyond the plan. Report the resulting artifact, dependency resolutions, working invocation, checks actually run, and any remaining prerequisites.
