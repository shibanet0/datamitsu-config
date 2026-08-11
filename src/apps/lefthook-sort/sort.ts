/**
 * Pure sort logic for lefthook configs, kept separate from the CLI entry (index.ts) so it can be
 * unit-tested without the file-IO side effects of `main()`.
 *
 * `sortDocument` reorders a lefthook config on two levels:
 *
 * 1. Top-level git-hook keys are ordered by the git lifecycle — the order in which the hooks fire, per
 *    githooks(5) (which lefthook mirrors). Non-hook global settings (`extends`, `min_version`,
 *    `remotes`, …) keep their order and stay above the hooks.
 * 2. Within each hook, the `commands:` map is ordered the way lefthook runs it — by `priority`
 *    ascending, then by name.
 *
 * Every comment is preserved via a round-trip through the `yaml` document AST.
 *
 * Lefthook treats `priority: 0` (and a missing priority) as `+Infinity`, i.e. "run last", so those
 * entries are ordered after every command with an explicit priority. Priority only takes effect
 * when the hook sets `parallel: false` or `piped: true`.
 */
import { isMap, type Pair, parseDocument, type YAMLMap } from "yaml";

/**
 * Git hooks in the order they fire across the git lifecycle, per githooks(5) — the same order and
 * set lefthook uses. Used to sort the top-level hook keys so the file reads chronologically.
 */
// cspell:ignore applypatch sendemail fsmonitor
const HOOK_ORDER: readonly string[] = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "pre-receive",
  "update",
  "proc-receive",
  "post-receive",
  "post-update",
  "reference-transaction",
  "push-to-checkout",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "fsmonitor-watchman",
  "p4-changelist",
  "p4-prepare-changelist",
  "p4-post-changelist",
  "p4-pre-submit",
  "post-index-change",
];

const HOOK_RANK: ReadonlyMap<string, number> = new Map(HOOK_ORDER.map((name, i) => [name, i]));

/**
 * Lefthook treats a missing priority — or `priority: 0` — as `+Infinity`, so such commands run
 * after every command with an explicit priority. We mirror that by sorting them last.
 */
const NO_PRIORITY = Number.MAX_SAFE_INTEGER;

/**
 * Reorder the `commands:` map of every hook in a lefthook config. Returns the rewritten YAML; a
 * document already in canonical order round-trips unchanged.
 */
export function sortDocument(source: string): string {
  const doc = parseDocument(source);
  const root = doc.contents;
  if (!isMap(root)) {
    return source;
  }

  // Order the top-level git hooks by the git lifecycle; non-hook global settings keep their
  // original order (stable sort) and stay above the hooks.
  root.items.sort(compareHooks);

  for (const hook of root.items) {
    const hookBody = hook.value;
    if (!isMap(hookBody)) {
      continue;
    }

    const commands = hookBody.get("commands", true) as undefined | YAMLMap;
    if (!isMap(commands)) {
      continue;
    }

    // Array.prototype.sort is stable in Node, so equal keys keep their order.
    // Each Pair carries its own leading/trailing comments, which travel with it.
    commands.items.sort(compareCommands);
  }

  return doc.toString({ lineWidth: 0 });
}

/**
 * Order two command entries by priority ascending, then name ascending.
 */
function compareCommands(a: Pair, b: Pair): number {
  const byPriority = priorityOf(a) - priorityOf(b);
  if (byPriority !== 0) {
    return byPriority;
  }

  const nameA = nameOf(a);
  const nameB = nameOf(b);
  if (nameA < nameB) {
    return -1;
  }
  return nameA > nameB ? 1 : 0;
}

/**
 * Order two top-level entries: global settings first (original order), then hooks by lifecycle.
 */
function compareHooks(a: Pair, b: Pair): number {
  const [groupA, rankA] = topLevelKey(a);
  const [groupB, rankB] = topLevelKey(b);
  return groupA === groupB ? rankA - rankB : groupA - groupB;
}

/**
 * The command name (map key) as a plain string, for the alphabetical tie-break.
 */
function nameOf(pair: Pair): string {
  const key = pair.key as string | { value?: unknown };
  return String(typeof key === "object" && key !== null ? (key.value ?? key) : key);
}

/**
 * Read a command entry's effective priority. A positive number sorts in place; `0` or a missing
 * priority is `+Infinity` (runs last), matching lefthook's own ordering.
 */
function priorityOf(pair: Pair): number {
  const value = pair.value;
  if (isMap(value)) {
    const priority = value.get("priority");
    if (typeof priority === "number" && priority > 0) {
      return priority;
    }
  }
  return NO_PRIORITY;
}

/**
 * Sort key for a top-level entry: `[group, rank]`. Non-hook global settings are group 0 with a
 * constant rank (a stable sort keeps their original order, above the hooks); known git hooks are
 * group 1, ranked by their position in the git lifecycle.
 */
function topLevelKey(pair: Pair): [number, number] {
  const rank = HOOK_RANK.get(nameOf(pair));
  return rank === undefined ? [0, 0] : [1, rank];
}
