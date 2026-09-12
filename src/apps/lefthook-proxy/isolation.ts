// cspell:ignore ACMRTUXB gitdir pathspecs
import { createHash, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { isAbsolute, resolve as resolvePath, sep } from "node:path";

import type { ProxyEnvironment } from "./env.js";

import {
  gitCommand,
  gitDirectory,
  gitOutput,
  listStashes,
  nulSeparatedPaths,
  operationInProgress,
  repositoryHasHead,
  repositoryRoot,
} from "./git.js";
import {
  IsolationFailureError,
  type IsolationTarget,
  type StashTransaction,
} from "./isolation-failure-error.js";
import { errorMessage, writeError } from "./messages.js";

type IndexState = "alternate" | "locked" | "repository";

const transactionMarkerPrefix = "datamitsu-lefthook-proxy-";
const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export async function isolateWorkingTree(
  target: IsolationTarget,
  environment: ProxyEnvironment,
): Promise<StashTransaction | undefined> {
  const root = await repositoryRoot();
  const directory = await gitDirectory(root);

  if (environment.gitIndexFile) {
    const state = gitIndexState(root, directory, environment.gitIndexFile);
    if (state === "locked") {
      writeError(
        `Git holds a temporary staging index (${environment.gitIndexFile}) that cannot be stashed safely`,
      );
      writeError(
        "running Lefthook WITHOUT working-tree isolation: hooks see untracked files and unstaged changes ('git commit -a' and 'git commit -- <path>' always commit this way)",
      );
      return undefined;
    }
    if (state === "alternate") {
      writeError(
        `Git is using an alternate index (${environment.gitIndexFile}); running Lefthook without working-tree isolation`,
      );
      return undefined;
    }
  }

  const operation = operationInProgress(directory);
  if (operation) {
    writeError(`${operation} is in progress; running Lefthook without working-tree isolation`);
    return undefined;
  }
  if (!(await repositoryHasHead(root))) {
    writeError(
      "initial commit has no HEAD snapshot; running Lefthook without working-tree isolation",
    );
    return undefined;
  }

  const worktree = worktreeIdentity(directory);
  const existingStashes = await listStashes(root);
  const orphanedEntry = existingStashes.find((entry) => transactionMarker(entry.subject, worktree));
  if (orphanedEntry) {
    const orphanedMarker = transactionMarker(orphanedEntry.subject, worktree)!;
    throw new IsolationFailureError(
      `unfinished transaction backup ${orphanedEntry.oid}; another proxy may still own it, so confirm no hook process is active before restoring it with git stash apply --index ${orphanedEntry.oid}`,
      orphanedMarker,
      root,
    );
  }

  const marker = `${transactionMarkerPrefix}${worktree}-${randomUUID()}`;
  const stashArguments = [
    "-C",
    root,
    "stash",
    "push",
    "--quiet",
    "--include-untracked",
    "--message",
    marker,
  ];
  if (target === "index") {
    stashArguments.push("--keep-index");
  }
  let pushFailure: unknown;
  try {
    await gitOutput(stashArguments);
  } catch (error) {
    pushFailure = error;
  }

  let transaction: StashTransaction | undefined;
  try {
    const entries = await listStashes(root);
    const ownEntry = entries.find((entry) => entry.subject.endsWith(marker));
    transaction = ownEntry
      ? { marker, oid: ownEntry.oid, repositoryRoot: root, target }
      : undefined;
  } catch (error) {
    const detail = errorMessage(error);
    throw new IsolationFailureError(
      `${pushFailure ? `${errorMessage(pushFailure)}; ` : ""}cannot locate transaction stash: ${detail}`,
      marker,
      root,
    );
  }

  if (pushFailure) {
    throw new IsolationFailureError(errorMessage(pushFailure), marker, root, transaction);
  }
  return transaction;
}

export function isolationTarget(args: readonly string[]): IsolationTarget | undefined {
  const runIndex = args.indexOf("run");
  if (runIndex === -1) {
    return undefined;
  }
  const hookArguments = new Set(args.slice(runIndex + 1));
  if (hookArguments.has("pre-commit")) {
    return "index";
  }
  return hookArguments.has("pre-push") ? "head" : undefined;
}

export async function restoreTransaction(transaction: StashTransaction): Promise<void> {
  if (transaction.target === "head") {
    await gitOutput(["-C", transaction.repositoryRoot, "read-tree", `${transaction.oid}^2`]);
  }

  const workingTreeBase =
    transaction.target === "index" ? `${transaction.oid}^2` : `${transaction.oid}^1`;
  const restorableTrackedPaths = await gitCommand([
    "-C",
    transaction.repositoryRoot,
    "diff",
    "--diff-filter=ACMRTUXB",
    "--name-only",
    "--no-ext-diff",
    "--no-renames",
    "-z",
    workingTreeBase,
    transaction.oid,
    "--",
  ]);
  if (restorableTrackedPaths.length > 0) {
    await gitCommand(
      [
        "-C",
        transaction.repositoryRoot,
        "--literal-pathspecs",
        "restore",
        `--source=${transaction.oid}`,
        "--worktree",
        "--pathspec-from-file=-",
        "--pathspec-file-nul",
      ],
      restorableTrackedPaths,
    );
  }

  const deletedTrackedPaths = await gitCommand([
    "-C",
    transaction.repositoryRoot,
    "diff",
    "--diff-filter=D",
    "--name-only",
    "--no-ext-diff",
    "--no-renames",
    "-z",
    workingTreeBase,
    transaction.oid,
    "--",
  ]);
  for (const path of nulSeparatedPaths(deletedTrackedPaths)) {
    rmSync(Buffer.concat([Buffer.from(`${transaction.repositoryRoot}${sep}`), path]), {
      force: true,
      recursive: true,
    });
  }

  const untrackedPaths = await untrackedPathspec(transaction);
  if (untrackedPaths.length > 0) {
    await gitCommand(
      [
        "-C",
        transaction.repositoryRoot,
        "--literal-pathspecs",
        "restore",
        `--source=${transaction.oid}^3`,
        "--worktree",
        "--pathspec-from-file=-",
        "--pathspec-file-nul",
      ],
      untrackedPaths,
    );
  }

  // Re-read the stash list instead of reusing the selector captured at push
  // time: another worktree sharing refs/stash may have pushed or dropped an
  // entry in the meantime, which shifts every stash@{n}.
  const entries = await listStashes(transaction.repositoryRoot);
  const ownEntry = entries.find(
    (entry) => entry.oid === transaction.oid && entry.subject.endsWith(transaction.marker),
  );
  if (!ownEntry) {
    throw new Error(`restored transaction stash ${transaction.oid} disappeared before cleanup`);
  }

  await gitOutput([
    "-C",
    transaction.repositoryRoot,
    "stash",
    "drop",
    "--quiet",
    "--",
    ownEntry.selector,
  ]);
}

function gitIndexState(
  repositoryRootPath: string,
  directory: string,
  gitIndexFile: string,
): IndexState {
  const configuredIndex = isAbsolute(gitIndexFile)
    ? resolvePath(gitIndexFile)
    : resolvePath(repositoryRootPath, gitIndexFile);
  if (configuredIndex === resolvePath(directory, "index")) {
    return "repository";
  }
  // `git commit -a` commits through <gitdir>/index.lock and `git commit -- <path>`
  // through <gitdir>/next-index-<pid>.lock. Both are locks Git holds for the
  // duration of the commit, so stashing under them would either fail or fight
  // Git for the index.
  return configuredIndex.endsWith(".lock") ? "locked" : "alternate";
}

function transactionMarker(subject: string, worktree: string): string | undefined {
  const match = subject.match(
    new RegExp(`${transactionMarkerPrefix}${worktree}-${uuidPattern}$`, "i"),
  );
  return match?.[0];
}

async function untrackedPathspec(transaction: StashTransaction): Promise<Buffer> {
  const parentsOutput = await gitOutput([
    "-C",
    transaction.repositoryRoot,
    "rev-list",
    "--parents",
    "-n",
    "1",
    transaction.oid,
  ]);
  const parents = parentsOutput.trim().split(" ");
  if (parents.length < 4) {
    return Buffer.alloc(0);
  }

  return await gitCommand([
    "-C",
    transaction.repositoryRoot,
    "ls-tree",
    "-rz",
    "--name-only",
    `${transaction.oid}^3`,
  ]);
}

/**
 * Stable per-worktree id derived from the worktree's own Git directory (`<common>/worktrees/<name>`
 * for a linked worktree, `<root>/.git` for the main one).
 *
 * Linked worktrees share `refs/stash`, so an unscoped "is there a proxy backup?" check would let a
 * commit in one worktree abort a commit in another. Scoping the orphan check to this worktree keeps
 * the fail-closed guarantee for our own crashed runs without the cross-worktree false positive.
 */
function worktreeIdentity(directory: string): string {
  return createHash("sha256").update(directory).digest("hex").slice(0, 12);
}
