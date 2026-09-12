import { devNull } from "node:os";
import { dirname } from "node:path";

// cspell:ignore PATHEXT
const keys = {
  active: "DATAMITSU_LEFTHOOK_PROXY_ACTIVE",
  upstream: "DATAMITSU_LEFTHOOK_UPSTREAM",
  upstreamDirectory: "DATAMITSU_LEFTHOOK_UPSTREAM_DIR",
  upstreamVersion: "DATAMITSU_LEFTHOOK_UPSTREAM_VERSION",
} as const;

export interface ProxyEnvironment {
  active: boolean;
  gitIndexFile?: string;
  noColor: boolean;
  path: string;
  pathExtensions: string;
  publicProxy?: string;
  upstream?: string;
  upstreamDirectory?: string;
  upstreamVersion?: string;
}

export function childEnvironment(markActive: boolean): NodeJS.ProcessEnv {
  return markActive ? { ...process.env, [keys.active]: "1" } : process.env;
}

export function hookRuntimeSettings() {
  return {
    directory: dirname(process.execPath),
    options: `--config=${devNull} --no-env-file --no-install`,
  };
}

export function proxyEnvironment(source: NodeJS.ProcessEnv = process.env): ProxyEnvironment {
  const gitIndexFile = source.GIT_INDEX_FILE;
  const publicProxy = source.LEFTHOOK_BIN;
  const upstream = source[keys.upstream];
  const upstreamDirectory = source[keys.upstreamDirectory];
  const upstreamVersion = source[keys.upstreamVersion];
  return {
    active: source[keys.active] === "1",
    ...(gitIndexFile ? { gitIndexFile } : {}),
    noColor: source.NO_COLOR !== undefined,
    path: source.PATH ?? "",
    pathExtensions: source.PATHEXT ?? ".EXE;.CMD;.BAT;.COM",
    ...(publicProxy ? { publicProxy } : {}),
    ...(upstream ? { upstream } : {}),
    ...(upstreamDirectory ? { upstreamDirectory } : {}),
    ...(upstreamVersion ? { upstreamVersion } : {}),
  };
}
