import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveDockerfileOutputs, selectDockerfileOutputDir } from "../lib/dockerfile-output.ts";
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

describe("Dockerfile output staging", () => {
  const variants = [
    { ociMap: "docker/oci-map.json", output: "docker/Dockerfile" },
    { ociMap: "docker/oci-map.alpine.json", output: "docker/Dockerfile.alpine" },
  ];

  const environmentOutput = resolve(tmpdir(), "rc-docker");
  const explicitOutput = resolve(tmpdir(), "explicit-docker");
  const configuredOutput = resolve(tmpdir(), "env-docker");

  it("takes the staging directory from the build environment and CLI", () => {
    expect(
      selectDockerfileOutputDir(["--offline"], { DATAMITSU_DOCKER_OUTPUT_DIR: environmentOutput }),
    ).toEqual({
      outputDir: environmentOutput,
      passthrough: ["--offline"],
    });
    expect(
      selectDockerfileOutputDir(["--offline", "--output-dir", explicitOutput], {
        DATAMITSU_DOCKER_OUTPUT_DIR: configuredOutput,
      }),
    ).toEqual({ outputDir: explicitOutput, passthrough: ["--offline"] });
  });

  it("keeps existing Docker artifacts unchanged when a custom core lacks a staging directory", () => {
    const root = mkdtempSync(join(tmpdir(), "docker-output-"));
    const dockerDir = join(root, "docker");
    mkdirSync(dockerDir, { recursive: true });
    const files = [
      ["Dockerfile", "existing glibc Dockerfile\n"],
      ["Dockerfile.alpine", "existing Alpine Dockerfile\n"],
      ["oci-map.json", "existing glibc map\n"],
      ["oci-map.alpine.json", "existing Alpine map\n"],
    ] as const;
    for (const [name, content] of files) writeFileSync(join(dockerDir, name), content);
    try {
      const before = files.map(([name]) => readFileSync(join(dockerDir, name), "utf8"));
      expect(() => resolveDockerfileOutputs(root, variants, undefined, true)).toThrow(
        /output-dir/u,
      );
      expect(files.map(([name]) => readFileSync(join(dockerDir, name), "utf8"))).toEqual(before);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("Dockerfile consistency", () => {
  // Regression guard: a Dockerfile generated from the demo config (a handful of
  // apps) instead of the full base config would have only a few stages.
  it("glibc Dockerfile has many FROM stages (not a demo config)", () => {
    expect(countFromStages(readFile("docker/Dockerfile"))).toBeGreaterThan(50);
  });

  it("alpine Dockerfile has many FROM stages (not a demo config)", () => {
    expect(countFromStages(readFile("docker/Dockerfile.alpine"))).toBeGreaterThan(50);
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
