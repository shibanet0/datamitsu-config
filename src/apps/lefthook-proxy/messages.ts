import type { StashTransaction } from "./isolation-failure-error.js";

import { proxyEnvironment } from "./env.js";
import { hookBindingFailureExitCode, restoreFailureExitCode } from "./exit-codes.js";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function writeError(message: string): void {
  process.stderr.write(`lefthook proxy: ${message}\n`);
}

export function writeProxyNotice(): void {
  const heading = "Datamitsu Lefthook proxy";
  const decoratedHeading =
    process.stderr.isTTY && !proxyEnvironment().noColor
      ? `\u{1B}[38;5;208m\u{1B}[1m${heading}\u{1B}[0m`
      : heading;
  process.stderr.write(`
${decoratedHeading}
  This is a Datamitsu-owned wrapper, not the upstream Lefthook executable.
  pre-commit: upstream sees the index snapshot; unstaged and untracked files are hidden.
  pre-push: upstream sees clean HEAD; staged, unstaged, and untracked files are hidden.
  Hidden state is kept in a private transaction stash and restored after Lefthook exits.
  This temporarily changes refs/stash, but does not rewrite branch history.
  On restore failure, the backup is retained and recovery instructions are printed.
  Isolation is skipped when Git holds a temporary staging index: 'git commit -a' and
  'git commit -- <path>' commit through one, so hooks there see the whole working tree.
  Exit ${restoreFailureExitCode} means isolation or restore failed; exit ${hookBindingFailureExitCode} means the Git hooks could not be rebound.
`);
}

export function writeRecovery(transaction: StashTransaction): void {
  writeError(`recovery backup preserved as ${transaction.oid}`);
  writeError(`inspect it with: git stash show --stat ${transaction.oid}`);
  writeError(`restore it with: git stash apply --index ${transaction.oid}`);
  writeError("remove it only after verifying the restored index and working tree");
}
