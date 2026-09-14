import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve as resolvePath } from "node:path";

import { proxyEnvironment, type ProxyEnvironment } from "./env.js";

/**
 * Name of the private upstream binary, kept off the public `lefthook` name on purpose.
 */
export const upstreamName = "dm-internal-lefthook-upstream";

/**
 * Name the proxy itself is installed under, and the one Git hooks must call back into.
 */
export const publicName = "lefthook";

const resolutionHelp =
  "run through datamitsu exec lefthook -- <args> or an activated Datamitsu source farm; " +
  "re-run datamitsu init to re-bind installed Git hooks";

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
    // A stale hook must not silently switch to a different upstream version on PATH.
    throw new Error(
      `configured private upstream is missing or not executable at ${override}; ${resolutionHelp}`,
    );
  }

  for (const directory of environment.path.split(delimiter)) {
    for (const name of executableNames(upstreamName, environment)) {
      const candidate = executableRealPath(join(directory || ".", name));
      if (candidate) {
        return assertNotRecursive(candidate);
      }
    }
  }

  throw new Error(`cannot find ${upstreamName}; ${resolutionHelp}`);
}

function assertNotRecursive(candidate: string): string {
  const entryPoint = process.argv[1];
  if (entryPoint && safeRealPath(entryPoint) === candidate) {
    throw new Error(`private upstream resolves to the proxy itself; ${resolutionHelp}`);
  }
  return candidate;
}

function executableNames(name: string, environment: ProxyEnvironment): string[] {
  if (process.platform !== "win32") {
    return [name];
  }

  const extensions = environment.pathExtensions.split(";").filter(Boolean);
  return [name, ...extensions.map((extension) => `${name}${extension}`)];
}

function executableRealPath(candidate: string): string | undefined {
  try {
    accessSync(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK);
    const stats = statSync(candidate);
    return stats.isFile() ? realpathSync(candidate) : undefined;
  } catch {
    return undefined;
  }
}

function isExecutable(candidate: string): boolean {
  return executableRealPath(candidate) !== undefined;
}

function safeRealPath(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}
