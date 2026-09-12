import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { errorMessage } from "./messages.js";

export interface StashEntry {
  oid: string;
  selector: string;
  subject: string;
}

export async function gitCommand(args: readonly string[], input?: Buffer): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const child = spawn("git", args, { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });
    child.stdin?.once("error", reject);
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      const message = Buffer.concat(stderr).toString("utf8").trim();
      reject(new Error(message || `git ${args.join(" ")} exited with code ${code ?? 1}`));
    });

    if (input) {
      child.stdin?.end(input);
    }
  });
}

export async function gitDirectory(repositoryRootPath: string): Promise<string> {
  const output = await gitOutput(["-C", repositoryRootPath, "rev-parse", "--absolute-git-dir"]);
  return output.trim();
}

export async function gitOutput(args: readonly string[]): Promise<string> {
  const output = await gitCommand(args);
  return output.toString("utf8");
}

export async function listStashes(repositoryRootPath: string): Promise<StashEntry[]> {
  const output = await gitOutput([
    "-C",
    repositoryRootPath,
    "stash",
    "list",
    "--format=%gd%x09%H%x09%gs",
  ]);
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [selector, oid, ...subjectParts] = line.split("\t");
      if (!selector || !oid || subjectParts.length === 0) {
        throw new Error(`cannot parse stash list line ${JSON.stringify(line)}`);
      }
      return { oid, selector, subject: subjectParts.join("\t") };
    });
}

export function nulSeparatedPaths(paths: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < paths.length; index += 1) {
    if (paths[index] !== 0) {
      continue;
    }
    if (index > start) {
      result.push(paths.subarray(start, index));
    }
    start = index + 1;
  }
  return result;
}

/**
 * Name of the in-flight Git operation (merge, rebase, …), if the repository is mid-operation.
 */
export function operationInProgress(directory: string): string | undefined {
  const operations = [
    ["MERGE_HEAD", "merge"],
    ["CHERRY_PICK_HEAD", "cherry-pick"],
    ["REVERT_HEAD", "revert"],
    ["rebase-merge", "rebase"],
    ["rebase-apply", "rebase"],
    ["sequencer", "sequencer operation"],
  ] as const;
  return operations.find(([path]) => existsSync(join(directory, path)))?.[1];
}

export async function repositoryHasHead(repositoryRootPath: string): Promise<boolean> {
  try {
    await gitOutput(["-C", repositoryRootPath, "rev-parse", "--verify", "--quiet", "HEAD"]);
    return true;
  } catch (error) {
    if (errorMessage(error).includes("exited with code 1")) {
      return false;
    }
    throw error;
  }
}

export async function repositoryRoot(): Promise<string> {
  const output = await gitOutput(["rev-parse", "--show-toplevel"]);
  return output.trim();
}
