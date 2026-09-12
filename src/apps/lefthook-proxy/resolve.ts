import { spawnSync } from "node:child_process";
import { accessSync, constants, readdirSync, realpathSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve as resolvePath } from "node:path";

import { proxyEnvironment, type ProxyEnvironment } from "./env.js";
import { writeError } from "./messages.js";

/**
 * Name of the private upstream binary, kept off the public `lefthook` name on purpose.
 */
export const upstreamName = "dm-internal-lefthook-upstream";

/**
 * Name the proxy itself is installed under, and the one Git hooks must call back into.
 */
export const publicName = "lefthook";

interface ExecutableEntry {
  modified: number;
  path: string;
}

export function resolvePublicProxy(environment: ProxyEnvironment = proxyEnvironment()): string {
  // Deliberately NOT realpath'd: this path is written into the installed Git
  // hooks, where the user-facing store link is the stable address, not whatever
  // content-addressed file it happens to point at today.
  if (environment.publicProxy && isExecutable(environment.publicProxy)) {
    return environment.publicProxy;
  }

  for (const directory of environment.path.split(delimiter)) {
    for (const name of executableNames(publicName, environment)) {
      const candidate = resolvePath(directory || ".", name);
      if (isExecutable(candidate)) {
        return candidate;
      }
    }
  }

  const entryPoint = process.argv[1];
  if (entryPoint) {
    const candidate = isAbsolute(entryPoint) ? entryPoint : resolvePath(entryPoint);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  throw new Error("cannot resolve the public lefthook proxy for installed Git hooks");
}

export function resolveUpstream(environment: ProxyEnvironment = proxyEnvironment()): string {
  const override = environment.upstream;
  if (override) {
    const candidate = executableRealPath(isAbsolute(override) ? override : resolvePath(override));
    if (candidate) {
      return assertNotRecursive(candidate);
    }
    writeError(`configured private upstream is missing at ${override}; trying managed fallbacks`);
  }

  const storeDirectory = environment.upstreamDirectory;
  if (storeDirectory) {
    const candidate = resolveFromStoreDirectory(storeDirectory, environment.upstreamVersion);
    if (candidate) {
      return assertNotRecursive(candidate);
    }
  }

  for (const directory of environment.path.split(delimiter)) {
    for (const name of executableNames(upstreamName, environment)) {
      const candidate = executableRealPath(join(directory || ".", name));
      if (candidate) {
        return assertNotRecursive(candidate);
      }
    }
  }

  throw new Error(
    `cannot find ${upstreamName}; activate the Datamitsu source farm or set DATAMITSU_LEFTHOOK_UPSTREAM`,
  );
}

function assertNotRecursive(candidate: string): string {
  const entryPoint = process.argv[1];
  if (entryPoint && safeRealPath(entryPoint) === candidate) {
    throw new Error("private upstream resolves to the proxy itself");
  }
  return candidate;
}

function executableEntry(candidate: string): ExecutableEntry | undefined {
  try {
    accessSync(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK);
    const stats = statSync(candidate);
    return stats.isFile() ? { modified: stats.mtimeMs, path: realpathSync(candidate) } : undefined;
  } catch {
    return undefined;
  }
}

function executableNames(name: string, environment: ProxyEnvironment): string[] {
  if (process.platform !== "win32") {
    return [name];
  }

  const extensions = environment.pathExtensions.split(";").filter(Boolean);
  return [name, ...extensions.map((extension) => `${name}${extension}`)];
}

function executableRealPath(candidate: string): string | undefined {
  return executableEntry(candidate)?.path;
}

function isExecutable(candidate: string): boolean {
  return executableEntry(candidate) !== undefined;
}

function resolveFromStoreDirectory(
  directory: string,
  expectedVersion: string | undefined,
): string | undefined {
  const candidates = storeCandidates(directory);
  if (!expectedVersion) {
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  // Probe newest-first and stop at the first hit. The store keeps every version
  // ever installed (one 13 MB binary per release), so probing all of them would
  // spawn a process per file on a code path that runs from `lefthook validate`.
  const normalizedVersion = expectedVersion.replace(/^v/, "");
  return candidates.find((candidate) => storeBinaryVersion(candidate) === normalizedVersion);
}

function safeRealPath(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}

function storeBinaryVersion(candidate: string): string | undefined {
  const result = spawnSync(candidate, ["version"], { encoding: "utf8", timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function storeCandidates(directory: string): string[] {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    return [];
  }

  const entries: ExecutableEntry[] = [];
  for (const name of names) {
    const entry = executableEntry(join(directory, name));
    if (entry) {
      entries.push(entry);
    }
  }
  return entries.sort((a, b) => b.modified - a.modified).map((entry) => entry.path);
}
