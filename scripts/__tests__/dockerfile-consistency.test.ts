import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

interface OciLayer {
  app?: string;
  kind: string;
  subtree: string;
}

interface OciMap {
  layers: OciLayer[];
  storeRoot: string;
  version: number;
}

function countFromStages(dockerfile: string): number {
  return (dockerfile.match(/^FROM /gm) ?? []).length;
}

function readFile(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function readOciMap(rel: string): OciMap {
  return JSON.parse(readFile(rel)) as OciMap;
}

describe("Dockerfile consistency", () => {
  // Regression guard: a Dockerfile generated from the demo config (a handful of
  // apps) instead of the full base config would have only a few stages.
  it("glibc Dockerfile has many FROM stages (not a demo config)", () => {
    expect(countFromStages(readFile("docker/Dockerfile"))).toBeGreaterThan(50);
  });

  it("alpine Dockerfile has many FROM stages (not a demo config)", () => {
    expect(countFromStages(readFile("docker/Dockerfile.alpine"))).toBeGreaterThan(50);
  });

  it("oci-map.json golangci-lint entry is a binary at .bin/golangci-lint", () => {
    const map = readOciMap("docker/oci-map.json");
    const entry = map.layers.find((e) => e.app === "golangci-lint");
    expect(entry, "golangci-lint must be in oci-map.json layers").toBeDefined();
    expect(entry!.subtree).toBe(".bin/golangci-lint");
    expect(entry!.kind).toBe("binary");
  });

  it("oci-map.alpine.json lefthook entry present", () => {
    const map = readOciMap("docker/oci-map.alpine.json");
    expect(map.layers.find((e) => e.app === "lefthook")).toBeDefined();
  });

  // Every non-runtime layer must have a matching build stage. Runtimes
  // (node/jvm/uv) are copied via differently-named stages, so they are excluded;
  // WASM parser modules use `parser-<name>` stages, everything else `app-<name>`.
  for (const [mapPath, dockerfilePath] of [
    ["docker/oci-map.json", "docker/Dockerfile"],
    ["docker/oci-map.alpine.json", "docker/Dockerfile.alpine"],
  ] as const) {
    it(`every layer in ${mapPath} has its build stage in ${dockerfilePath}`, () => {
      const map = readOciMap(mapPath);
      const dockerfile = readFile(dockerfilePath);
      const apps = map.layers.filter((e) => e.app && e.kind !== "runtime");
      expect(apps.length).toBeGreaterThan(50);
      for (const { app, kind } of apps) {
        const stage = kind === "parser" ? `parser-${app}` : `app-${app}`;
        expect(dockerfile, `Stage '${stage}' missing from ${dockerfilePath}`).toContain(stage);
      }
    });
  }
});
