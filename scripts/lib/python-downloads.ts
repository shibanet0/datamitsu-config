export interface PythonDownload {
  arch: { family: string; variant: string };
  build: string;
  hash: string;
  libc: string;
  major: number;
  minor: number;
  name: string;
  os: string;
  patch: number;
  prerelease: string;
  url: string;
  variant: string;
}

export interface UpstreamPythonDownload {
  arch?: { family?: unknown; variant?: unknown };
  build?: unknown;
  libc?: unknown;
  major?: unknown;
  minor?: unknown;
  name?: unknown;
  os?: unknown;
  patch?: unknown;
  prerelease?: unknown;
  sha256?: unknown;
  url?: unknown;
  variant?: unknown;
}

export function selectPythonDownloads(
  upstream: Record<string, UpstreamPythonDownload>,
  version: string,
): Record<string, PythonDownload> {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid Python version: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  const selected: Record<string, PythonDownload> = {};
  for (const key of Object.keys(upstream).sort()) {
    const entry = upstream[key]!;
    if (
      entry.name !== "cpython" ||
      entry.major !== major ||
      entry.minor !== minor ||
      entry.patch !== patch ||
      entry.prerelease !== "" ||
      (entry.variant != null && entry.variant !== "") ||
      (entry.arch?.variant != null && entry.arch.variant !== "")
    )
      continue;
    if (!/^[0-9a-f]{64}$/.test(String(entry.sha256 ?? ""))) {
      throw new Error(`Missing or invalid SHA-256 for upstream catalog entry ${key}`);
    }
    if (
      typeof entry.url !== "string" ||
      !/^https?:\/\//.test(entry.url) ||
      typeof entry.arch?.family !== "string" ||
      typeof entry.os !== "string" ||
      typeof entry.libc !== "string" ||
      typeof entry.build !== "string"
    )
      throw new Error(`Missing required metadata for upstream catalog entry ${key}`);
    selected[key] = {
      arch: { family: entry.arch.family, variant: "" },
      build: entry.build,
      hash: `sha256:${entry.sha256}`,
      libc: entry.libc,
      major,
      minor,
      name: "cpython",
      os: entry.os,
      patch,
      prerelease: "",
      url: entry.url,
      variant: "",
    };
  }
  if (Object.keys(selected).length === 0) {
    throw new Error(
      `No stable default-GIL CPython ${version} entries in upstream download metadata`,
    );
  }
  return selected;
}
