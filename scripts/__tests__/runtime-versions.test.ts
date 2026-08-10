import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runtimeVersions } from "../../src/datamitsu-config/constants";

const ROOT = join(import.meta.dirname, "../..");
const CACHE_DIR = join(ROOT, "node_modules/.cache/datamitsu-config");

interface RuntimesRegistry {
  node: { node: { nodeVersion: string } };
  uv: { uv: { pythonVersion: string } };
}

interface UVPythonEntry {
  major: number;
  minor: number;
  name: string;
  patch: number;
  prerelease: null | string;
}

function readFile(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const RUNTIMES_PATH = "src/datamitsu-config/registries/runtimes.json";
const runtimesRaw = readFile(RUNTIMES_PATH);
const runtimes = JSON.parse(runtimesRaw) as RuntimesRegistry;

/**
 * The uv release the registry pins, read back from the download URLs rather than a dedicated field
 * — the version only exists as part of those URLs.
 */
function pinnedUVVersion(): string {
  const versions = new Set(
    [...runtimesRaw.matchAll(/astral-sh\/uv\/releases\/download\/([^/]+)\//g)].map((m) => m[1]!),
  );
  expect(
    versions.size,
    `${RUNTIMES_PATH} pins mixed uv versions: ${[...versions].join(", ")}`,
  ).toBe(1);

  return [...versions][0]!;
}

/**
 * The stable CPython versions a uv release can install, read from the download table in its tagged
 * source tree — uv compiles exactly this table into the binary, so it is what `uv python install`
 * resolves against.
 *
 * Cached per uv version: the table is a few MiB and only changes when the pin moves, but this test
 * runs on every commit via lefthook.
 */
async function uvSupportedPythonVersions(uvVersion: string): Promise<string[]> {
  const cachePath = join(CACHE_DIR, `uv-python-${uvVersion}.json`);
  try {
    return JSON.parse(readFileSync(cachePath, "utf8")) as string[];
  } catch {
    // Not cached yet — fall through to the network.
  }

  const url = `https://raw.githubusercontent.com/astral-sh/uv/${uvVersion}/crates/uv-python/download-metadata.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  const entries = (await response.json()) as Record<string, UVPythonEntry>;
  const versions = [
    ...new Set(
      Object.values(entries)
        .filter((e) => e.name === "cpython" && !e.prerelease)
        .map((e) => `${e.major}.${e.minor}.${e.patch}`),
    ),
  ];

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(versions));

  return versions;
}

describe("managed runtime versions", () => {
  // constants.ts is hand-maintained alongside the pulled registry; drift between
  // them means the bundled config and the tools it drives disagree on Python.
  it("constants.ts Python matches the runtimes registry", () => {
    expect(runtimeVersions.python).toBe(runtimes.uv.uv.pythonVersion);
  });

  it("constants.ts Node matches the runtimes registry and .node-version", () => {
    expect(runtimeVersions.node).toBe(runtimes.node.node.nodeVersion);
    expect(runtimeVersions.node).toBe(readFile(".node-version").trim());
  });

  /**
   * Regression guard. uv resolves a Python version against a download table baked into the binary
   * at build time, so a CPython patch released after the pinned uv is uninstallable however current
   * it looks. The two pins move on independent cadences — Python from endoflife.date with no age
   * gate, uv from GitHub behind the 7-day minimum-release-age gate — so they drift apart on their
   * own: pinning CPython 3.14.7 against uv 0.12.1 (which stops at 3.14.6) broke every managed
   * Python tool with "No interpreter found for Python 3.14.7".
   */
  it("pinned Python is installable by the pinned uv", async (ctx) => {
    const uvVersion = pinnedUVVersion();

    let supported: string[];
    try {
      supported = await uvSupportedPythonVersions(uvVersion);
    } catch (error) {
      // Offline: leave the guard to CI rather than blocking a local commit.
      ctx.skip(`could not read uv ${uvVersion} Python metadata: ${String(error)}`);

      return;
    }

    expect(
      supported,
      `uv ${uvVersion} cannot install Python ${runtimeVersions.python}. Pin a Python that uv ` +
        `supports (newest on that line: ${
          supported
            .filter((v) =>
              v.startsWith(runtimeVersions.python.split(".").slice(0, 2).join(".") + "."),
            )
            .sort((a, b) => Number(a.split(".")[2]) - Number(b.split(".")[2]))
            .at(-1) ?? "none"
        }), or bump uv to a release that does.`,
    ).toContain(runtimeVersions.python);
  });
});
