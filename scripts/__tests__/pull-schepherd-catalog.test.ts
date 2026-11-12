import { describe, expect, it } from "vitest";

import { minReleaseAgeCutoffFromEnvironment } from "../pull-external-apps.ts";
import { parseCatalogTag, parsePullerArgs, selectCatalogTag } from "../pull-schepherd-catalog.ts";
describe("parseCatalogTag", () => {
  it("reads the UTC minute of publication from the tag", () => {
    expect(parseCatalogTag("catalog-20260929.1809")).toEqual(new Date("2026-09-29T18:09:00Z"));
  });

  it("rejects the mutable tag, client tags and the OCI referrer tags", () => {
    expect(parseCatalogTag("catalog-latest")).toBeUndefined();
    expect(parseCatalogTag("v0.1.0")).toBeUndefined();
    expect(parseCatalogTag("sha256-d2cb65dd400b")).toBeUndefined();
  });
});

describe("selectCatalogTag", () => {
  const tags = [
    "catalog-20260915.0300",
    "catalog-latest",
    "catalog-20260922.0300",
    "catalog-20260929.1809",
    "",
  ];

  it("takes the newest revision published before the cutoff", () => {
    expect(selectCatalogTag(tags, new Date("2026-09-23T00:00:00Z"))).toBe("catalog-20260922.0300");
  });

  it("takes the newest revision when the age filter is disabled", () => {
    expect(selectCatalogTag(tags, undefined)).toBe("catalog-20260929.1809");
  });

  it("returns undefined when nothing is old enough", () => {
    expect(selectCatalogTag(tags, new Date("2026-09-01T00:00:00Z"))).toBeUndefined();
  });
});

describe("parsePullerArgs", () => {
  it("rewrites the current pin without selecting a newer revision", () => {
    expect(
      parsePullerArgs(["--write", "--config", "fixtures/rc-layer.js", "./schepherdCatalog.json"]),
    ).toEqual({
      configPath: "fixtures/rc-layer.js",
      registryPath: "./schepherdCatalog.json",
      update: false,
      write: true,
    });
  });
});

describe("release age build environment", () => {
  it("reads the Taskfile-provided minimum without changing its semantics", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    expect(minReleaseAgeCutoffFromEnvironment(now, { DATAMITSU_MIN_RELEASE_AGE: "60" })).toEqual(
      new Date("2026-11-07T11:00:00Z"),
    );
  });
});
