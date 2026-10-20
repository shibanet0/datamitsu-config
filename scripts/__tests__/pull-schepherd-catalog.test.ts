import { describe, expect, it } from "vitest";

import {
  buildGlobs,
  parseCatalogTag,
  selectCatalogTag,
  toGlob,
} from "../pull-schepherd-catalog.ts";

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

describe("toGlob", () => {
  it("matches a bare name at any depth", () => {
    expect(toGlob("package.json")).toBe("**/package.json");
    expect(toGlob("*.cf.yaml")).toBe("**/*.cf.yaml");
  });

  it("anchors a leading slash or dot-slash at the workspace root", () => {
    expect(toGlob("/tsconfig.json")).toBe("tsconfig.json");
    expect(toGlob("./renovate.json")).toBe("renovate.json");
  });

  it("keeps a pattern that already names a relative path", () => {
    expect(toGlob("**/.github/workflows/*.yml")).toBe("**/.github/workflows/*.yml");
    expect(toGlob("config/**/*.yaml")).toBe("config/**/*.yaml");
  });

  it("drops negative patterns and formats the validator cannot read", () => {
    expect(toGlob("!**/node_modules/**")).toBeUndefined();
    expect(toGlob("pyproject.toml")).toBeUndefined();
    expect(toGlob("*.jsonc")).toBeUndefined();
    expect(toGlob("renovate.json5")).toBeUndefined();
    expect(toGlob(".babelrc")).toBeUndefined();
  });
});

describe("buildGlobs", () => {
  it("leaves out every pattern of a schema that does not compile", () => {
    const globs = buildGlobs(
      [
        { fileMatch: ["package.json"], id: "package" },
        { fileMatch: ["yamlfmt.yaml", ".yamlfmt"], id: "yamlfmt" },
      ],
      { yamlfmt: "does not compile: …" },
    );
    expect(globs).toEqual(["**/package.json"]);
  });

  it("keeps only the YAML patterns of a schema whose JSON files are JSONC", () => {
    const globs = buildGlobs(
      [{ fileMatch: [".eslintrc", ".eslintrc.json", ".eslintrc.yml"], id: "eslintrc" }],
      {},
    );
    expect(globs).toEqual(["**/.eslintrc.yml"]);
  });

  it("deduplicates and sorts", () => {
    const globs = buildGlobs(
      [
        { fileMatch: ["b.yaml", "a.json"], id: "one" },
        { fileMatch: ["a.json"], id: "two" },
      ],
      {},
    );
    expect(globs).toEqual(["**/a.json", "**/b.yaml"]);
  });
});
