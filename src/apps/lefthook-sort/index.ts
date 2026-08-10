#!/usr/bin/env node
/**
 * Lefthook-sort — reorder a lefthook config into reading order.
 *
 * Rewrites each hook's `commands:` map into execution order (by `priority`, then name) while
 * preserving comments, so the file reads top-to-bottom the way lefthook runs it. See ./sort.ts for
 * the ordering rules (including lefthook's `priority: 0` = "run last" semantics).
 *
 * Invoked by lefthook as the last job of the `fix` phase (see the generated `lefthook.yaml`),
 * typically as:
 *
 * Node .datamitsu/lefthook-sort.mjs {staged_files}
 *
 * With no file arguments it falls back to `lefthook.yaml` in the cwd. Writes are idempotent: a file
 * already in canonical order is left untouched (and its mtime is not bumped), so re-running never
 * creates spurious churn.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { sortDocument } from "./sort";

function main(): void {
  const files = process.argv.slice(2);
  const targets = files.length > 0 ? files : ["lefthook.yaml"];

  for (const file of targets) {
    if (!existsSync(file)) {
      continue;
    }

    const before = readFileSync(file, "utf8");
    const after = sortDocument(before);
    if (after !== before) {
      writeFileSync(file, after);
    }
  }
}

main();
