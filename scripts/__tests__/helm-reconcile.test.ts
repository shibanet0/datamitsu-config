import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { fixtureEnvironment } from "../../src/apps/test-support/env.js";

const ROOT = join(import.meta.dirname, "../..");
const BASE_CONFIG = join(ROOT, "datamitsu.config.base.js");
const CORE_CLI = join(
  dirname(fileURLToPath(import.meta.resolve("@datamitsu/datamitsu/package.json"))),
  "bin/index.js",
);
const fixtures: string[] = [];

const reconcile = (cwd: string) =>
  execFileSync(
    process.execPath,
    [CORE_CLI, "--before-config", BASE_CONFIG, "config", "reconcile", "--skip-fix"],
    { cwd, env: fixtureEnvironment(), stdio: "pipe" },
  );

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { force: true, recursive: true });
});

describe("Helm chart reconciliation", () => {
  it("creates chart formatter configs without creating or changing datamitsuignore files", () => {
    const root = mkdtempSync(join(tmpdir(), "helm-reconcile-"));
    fixtures.push(root);
    execFileSync("git", ["init", "--quiet", root], { env: fixtureEnvironment() });
    writeFileSync(
      join(root, "datamitsu.config.js"),
      `globalThis.getMinVersion = () => "0.6.0";
globalThis.getConfig = (input) => ({
  ...input,
  managedConfigs: Object.fromEntries(
    Object.entries(input.managedConfigs).filter(([name]) => name === ".helmfmt" || name === ".datamitsuignore")
  ),
  tools: { helmfmt: input.tools.helmfmt },
});

`,
    );
    writeFileSync(join(root, "Chart.yaml"), "apiVersion: v2\nname: root-chart\nversion: 1.0.0\n");
    const nestedChart = join(root, "charts/demo");
    mkdirSync(nestedChart, { recursive: true });
    writeFileSync(join(nestedChart, "Chart.yaml"), "apiVersion: v2\nname: demo\nversion: 1.0.0\n");

    const rootIgnore = "vendor/**: *\n";
    writeFileSync(join(root, ".datamitsuignore"), rootIgnore);

    reconcile(root);
    const firstRootHelmfmt = readFileSync(join(root, ".helmfmt"), "utf8");
    const firstNestedHelmfmt = readFileSync(join(nestedChart, ".helmfmt"), "utf8");

    expect(firstRootHelmfmt).toContain('"indent_size": 2');
    expect(firstNestedHelmfmt).toContain('"indent_size": 2');
    expect(existsSync(join(root, "charts/demo/.datamitsuignore"))).toBe(false);
    expect(readFileSync(join(root, ".datamitsuignore"), "utf8")).toBe(rootIgnore);

    reconcile(root);
    expect(readFileSync(join(root, ".helmfmt"), "utf8")).toBe(firstRootHelmfmt);
    expect(readFileSync(join(nestedChart, ".helmfmt"), "utf8")).toBe(firstNestedHelmfmt);
    expect(existsSync(join(root, "charts/demo/.datamitsuignore"))).toBe(false);
    expect(readFileSync(join(root, ".datamitsuignore"), "utf8")).toBe(rootIgnore);
  });
});
