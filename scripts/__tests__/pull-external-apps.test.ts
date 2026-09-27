import { describe, expect, it } from "vitest";

import {
  compareVersions,
  minReleaseAgeCutoff,
  parseChecksumFile,
  parseVersion,
  type Release,
  selectRelease,
} from "../pull-external-apps.ts";

const release = (tag: string, publishedAt: string, extra: Partial<Release> = {}): Release => ({
  draft: false,
  prerelease: false,
  publishedAt,
  tag,
  ...extra,
});

describe("parseVersion and compareVersions", () => {
  it("parses tags with and without a leading v", () => {
    expect(parseVersion("v1.37.1")).toEqual([1, 37, 1]);
    expect(parseVersion("4.3.0")).toEqual([4, 3, 0]);
  });

  it("rejects pre-release and malformed tags", () => {
    expect(parseVersion("v1.38.0-rc.1")).toBeUndefined();
    expect(parseVersion("stable")).toBeUndefined();
  });

  it("compares numerically, not lexically", () => {
    expect(compareVersions("v1.37.10", "v1.37.9")).toBeGreaterThan(0);
    expect(compareVersions("v4.3.0", "v4.3.0")).toBe(0);
    expect(compareVersions("v3.19.4", "v4.0.0")).toBeLessThan(0);
  });
});

describe("selectRelease", () => {
  const cutoff = new Date("2026-09-19T16:00:00Z");

  it("takes the newest release older than the cutoff", () => {
    const releases = [
      release("v1.37.1", "2026-09-23T19:13:17Z"),
      release("v1.37.0", "2026-08-26T10:00:00Z"),
      release("v1.36.9", "2026-08-20T10:00:00Z"),
    ];
    expect(selectRelease(releases, "v1.37.1", cutoff)).toBe("v1.37.0");
  });

  it("never exceeds upstream's own latest", () => {
    const releases = [
      release("v1.38.0", "2026-09-01T00:00:00Z"),
      release("v1.37.0", "2026-08-26T00:00:00Z"),
    ];
    expect(selectRelease(releases, "v1.37.0", cutoff)).toBe("v1.37.0");
  });

  it("picks by version, not by publish date", () => {
    const releases = [
      release("v3.19.9", "2026-09-10T00:00:00Z"),
      release("v4.3.0", "2026-09-09T00:00:00Z"),
    ];
    expect(selectRelease(releases, "v4.3.0", cutoff)).toBe("v4.3.0");
  });

  it("skips drafts, pre-releases and unparsable tags", () => {
    const releases = [
      release("v2.0.0", "2026-09-01T00:00:00Z", { draft: true }),
      release("v1.9.0", "2026-09-01T00:00:00Z", { prerelease: true }),
      release("v1.8.0-rc.1", "2026-09-01T00:00:00Z"),
      release("v1.7.0", "2026-09-01T00:00:00Z"),
    ];
    expect(selectRelease(releases, "v2.0.0", cutoff)).toBe("v1.7.0");
  });

  it("returns undefined when nothing is old enough", () => {
    expect(
      selectRelease([release("v1.37.1", "2026-09-23T19:13:17Z")], "v1.37.1", cutoff),
    ).toBeUndefined();
  });

  it("ignores the age when the cutoff is disabled", () => {
    expect(selectRelease([release("v1.37.1", "2026-09-23T19:13:17Z")], "v1.37.1", undefined)).toBe(
      "v1.37.1",
    );
  });
});

describe("parseChecksumFile", () => {
  const hash = "121f6c7afe1d4d0e3ea6aab9432038599250134cbf4474cb1167d2c7decd4278";

  it("reads a bare hash", () => {
    expect(parseChecksumFile(`${hash}\n`)).toBe(hash);
  });

  it("reads the sha256sum format", () => {
    expect(parseChecksumFile(`${hash.toUpperCase()}  helm-v4.3.0-linux-amd64.tar.gz\n`)).toBe(hash);
  });

  it("returns undefined without a hash", () => {
    expect(parseChecksumFile("<html>Not Found</html>")).toBeUndefined();
  });
});

describe("minReleaseAgeCutoff", () => {
  const now = new Date("2026-09-26T16:00:00Z");

  it("defaults to seven days", () => {
    expect(minReleaseAgeCutoff(undefined, now)?.toISOString()).toBe("2026-09-19T16:00:00.000Z");
  });

  it("reads minutes", () => {
    expect(minReleaseAgeCutoff("60", now)?.toISOString()).toBe("2026-09-26T15:00:00.000Z");
  });

  it("is disabled by zero", () => {
    expect(minReleaseAgeCutoff("0", now)).toBeUndefined();
  });

  it("rejects anything that is not a non-negative integer", () => {
    expect(() => minReleaseAgeCutoff("7d", now)).toThrow("non-negative integer");
    expect(() => minReleaseAgeCutoff("-1", now)).toThrow("non-negative integer");
  });
});
