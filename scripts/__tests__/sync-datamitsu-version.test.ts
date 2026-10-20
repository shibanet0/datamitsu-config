import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  isUnstableVersion,
  readDatamitsuVersion,
  syncDatamitsuVersion,
  updateMinVersion,
  updateSelfPin,
} from "../sync-datamitsu-version.ts";

describe("isUnstableVersion", () => {
  it("should return true for unstable versions", () => {
    expect(isUnstableVersion("0.0.0-unstable.20260522.abc1234")).toBe(true);
    expect(isUnstableVersion("0.0.0-unstable.20260101.def5678")).toBe(true);
  });

  it("should return false for stable versions", () => {
    expect(isUnstableVersion("0.0.11")).toBe(false);
    expect(isUnstableVersion("1.0.0")).toBe(false);
  });

  it("should return false for prerelease versions", () => {
    expect(isUnstableVersion("0.0.11-rc.1")).toBe(false);
    expect(isUnstableVersion("0.0.11-alpha.1")).toBe(false);
  });
});

describe("readDatamitsuVersion", () => {
  it("reads the datamitsu version from the pnpm workspace catalog", () => {
    const workspaceYaml = `catalog:
  "@datamitsu/datamitsu": 0.0.0-unstable.20261007.33fdfa9
`;

    expect(readDatamitsuVersion(workspaceYaml)).toBe("0.0.0-unstable.20261007.33fdfa9");
  });

  it("rejects a workspace without a datamitsu catalog pin", () => {
    expect(() => readDatamitsuVersion("catalog: {}\n")).toThrow(
      "Could not find @datamitsu/datamitsu in the pnpm workspace catalog",
    );
  });
});

describe("updateSelfPin", () => {
  const rootConfig = `dependencies: {
  "@datamitsu/datamitsu": "catalog:",
}
catalog:
  "@datamitsu/datamitsu": 0.0.10
`;

  it("updates the catalog pin without replacing the package catalog reference", () => {
    const [result, changed] = updateSelfPin(rootConfig, "0.0.11");

    expect(changed).toBe(true);
    expect(result).toContain('"@datamitsu/datamitsu": "catalog:"');
    expect(result).toContain('"@datamitsu/datamitsu": 0.0.11');
  });

  it("returns unchanged when the catalog pin already matches", () => {
    const [result, changed] = updateSelfPin(rootConfig, "0.0.10");

    expect(changed).toBe(false);
    expect(result).toBe(rootConfig);
  });

  it("rejects a root config without a catalog pin", () => {
    expect(() =>
      updateSelfPin('dependencies: { "@datamitsu/datamitsu": "catalog:" }', "0.0.11"),
    ).toThrow('Could not find the "@datamitsu/datamitsu" catalog pin in datamitsu.config.ts');
  });
});

describe("updateMinVersion", () => {
  const configTs = ["const getMinVersion = (): string => {", '  return "0.0.10";', "};"].join("\n");

  it("should update the minVersion return value", () => {
    const [result, changed] = updateMinVersion(configTs, "0.0.11");
    expect(changed).toBe(true);
    expect(result).toContain('return "0.0.11"');
    expect(result).not.toContain("0.0.10");
  });

  it("should return unchanged when version already matches", () => {
    const [result, changed] = updateMinVersion(configTs, "0.0.10");
    expect(changed).toBe(false);
    expect(result).toBe(configTs);
  });

  it("should handle prerelease versions", () => {
    const [result, changed] = updateMinVersion(configTs, "0.0.11-rc.1");
    expect(changed).toBe(true);
    expect(result).toContain('return "0.0.11-rc.1"');
  });

  it.each(["0.5.1", "0.4.99", "0.5.2-rc.1"])(
    "rejects a core pin %s below the configuration's required features",
    (version) => {
      const config = 'const getMinVersion = () => { return "0.5.2"; };';
      expect(() => updateMinVersion(config, version)).toThrow(
        "Cannot lower the required datamitsu version",
      );
    },
  );

  it("does not mistake a newer minor for a downgrade from a larger patch", () => {
    const config = 'const getMinVersion = () => { return "0.5.12"; };';
    expect(updateMinVersion(config, "0.6.0")).toEqual([
      'const getMinVersion = () => { return "0.6.0"; };',
      true,
    ]);
  });

  it("should throw on missing return pattern", () => {
    expect(() => updateMinVersion("const x = 1;", "0.0.11")).toThrow(
      'Could not find return "..." pattern',
    );
  });
});

describe("syncDatamitsuVersion", () => {
  it("rejects an incompatible stable core before rewriting either configuration", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "datamitsu-min-version-"));
    try {
      const configPath = path.join(root, "src/datamitsu-config/datamitsu.config.ts");
      const rootConfigPath = path.join(root, "datamitsu.config.ts");
      const source = 'const getMinVersion = () => { return "0.5.2"; };';
      const rootSource = 'catalog:\n  "@datamitsu/datamitsu": 0.5.2\n';
      await mkdir(path.dirname(configPath), { recursive: true });
      await writeFile(configPath, source);
      await writeFile(rootConfigPath, rootSource);
      await writeFile(
        path.join(root, "pnpm-workspace.yaml"),
        'catalog:\n  "@datamitsu/datamitsu": 0.5.1\n',
      );

      await expect(syncDatamitsuVersion(root)).rejects.toThrow(
        "Cannot lower the required datamitsu version",
      );
      expect(await readFile(configPath, "utf8")).toBe(source);
      expect(await readFile(rootConfigPath, "utf8")).toBe(rootSource);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
