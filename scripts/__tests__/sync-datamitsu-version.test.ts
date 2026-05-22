import { describe, expect, it } from "vitest";

import {
  isUnstableVersion,
  updateDockerfileFromLine,
  updateMinVersion,
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

describe("updateDockerfileFromLine", () => {
  const dockerfile = [
    "# syntax=docker/dockerfile:1",
    "",
    "# Base datamitsu image (version locked to dependency in package.json)",
    "FROM ghcr.io/datamitsu/datamitsu:0.0.9",
    "",
    "WORKDIR /opt/datamitsu-config",
  ].join("\n");

  const dockerfileAlpine = [
    "# syntax=docker/dockerfile:1",
    "",
    "# Base datamitsu image (version locked to dependency in package.json)",
    "FROM ghcr.io/datamitsu/datamitsu:0.0.9-alpine",
    "",
    "WORKDIR /opt/datamitsu-config",
  ].join("\n");

  it("should update Dockerfile FROM version", () => {
    const [result, changed] = updateDockerfileFromLine(dockerfile, "0.0.11", false);
    expect(changed).toBe(true);
    expect(result).toContain("FROM ghcr.io/datamitsu/datamitsu:0.0.11");
    expect(result).not.toContain("0.0.9");
  });

  it("should update alpine Dockerfile FROM version", () => {
    const [result, changed] = updateDockerfileFromLine(dockerfileAlpine, "0.0.11", true);
    expect(changed).toBe(true);
    expect(result).toContain("FROM ghcr.io/datamitsu/datamitsu:0.0.11-alpine");
    expect(result).not.toContain("0.0.9");
  });

  it("should return unchanged when version already matches", () => {
    const [result, changed] = updateDockerfileFromLine(dockerfile, "0.0.9", false);
    expect(changed).toBe(false);
    expect(result).toBe(dockerfile);
  });

  it("should return unchanged when alpine version already matches", () => {
    const [result, changed] = updateDockerfileFromLine(dockerfileAlpine, "0.0.9", true);
    expect(changed).toBe(false);
    expect(result).toBe(dockerfileAlpine);
  });

  it("should handle prerelease versions", () => {
    const [result, changed] = updateDockerfileFromLine(dockerfile, "0.0.11-rc.1", false);
    expect(changed).toBe(true);
    expect(result).toContain("FROM ghcr.io/datamitsu/datamitsu:0.0.11-rc.1");
  });

  it("should throw on missing FROM line", () => {
    expect(() => updateDockerfileFromLine("WORKDIR /app", "0.0.11", false)).toThrow(
      "Could not find FROM ghcr.io/datamitsu/datamitsu:... line",
    );
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

  it("should throw on missing return pattern", () => {
    expect(() => updateMinVersion("const x = 1;", "0.0.11")).toThrow(
      'Could not find return "..." pattern',
    );
  });
});
