import fastGlob from "fast-glob";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { PULUMI_GLOB_IGNORE_PATTERNS } from "./constants";

/**
 * Finds state files once per physical file.
 *
 * In a pnpm workspace a stack package is also reachable through `node_modules` symlinks of its
 * dependents. Visiting those aliases would run several concurrent SOPS operations on the same file,
 * so symlinks are not followed and results are deduplicated by real path.
 */
export async function findStateFiles(
  patterns: readonly string[],
  ignore: readonly string[] = [],
): Promise<string[]> {
  const { glob } = fastGlob;

  const files = await glob([...patterns], {
    absolute: true,
    cwd: process.cwd(),
    followSymbolicLinks: false,
    ignore: [...PULUMI_GLOB_IGNORE_PATTERNS, ...ignore],
  });

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const file of files) {
    // oxlint-disable-next-line no-await-in-loop
    const realPath = await fs.realpath(file).catch(() => file);
    if (!seen.has(realPath)) {
      seen.add(realPath);
      unique.push(file);
    }
  }

  return unique;
}

/**
 * Replaces `target` without ever leaving it truncated: the content goes to a sibling temporary file
 * first and is renamed over the target, which is atomic on the same filesystem.
 */
export async function writeFileAtomic(target: string, content: Buffer | string): Promise<void> {
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp`,
  );

  try {
    await fs.writeFile(temporary, content, { mode: 0o600 });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}
