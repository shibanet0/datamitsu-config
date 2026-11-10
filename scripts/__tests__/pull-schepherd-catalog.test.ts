import { describe, expect, it } from "vitest";

import { minReleaseAgeCutoffFromEnvironment } from "../pull-external-apps.ts";
import {
  buildCoveringData,
  buildCoveringGlobs,
  buildValidatorMetadata,
  parseCatalogTag,
  parsePullerArgs,
  selectCatalogTag,
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

describe("parsePullerArgs", () => {
  it("refreshes discovery without implying an upstream update", () => {
    expect(
      parsePullerArgs([
        "--refresh-discovery",
        "--config",
        "fixtures/rc-layer.js",
        "./schepherdCatalog.json",
      ]),
    ).toEqual({
      configPath: "fixtures/rc-layer.js",
      refreshDiscovery: true,
      registryPath: "./schepherdCatalog.json",
      update: false,
    });
  });

  it("rejects selecting a new revision during a discovery-only refresh", () => {
    expect(() => parsePullerArgs(["--update", "--refresh-discovery", "catalog.json"])).toThrow(
      /mutually exclusive/u,
    );
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

describe("catalog covering collisions", () => {
  it("omits ambiguous exact globs while recording every candidate schema", () => {
    const validators = ["sourcemeta", "check-jsonschema", "ajv"];
    const patterns = [
      {
        covering: {
          excluded: [
            {
              glob: "**/manifest.json",
              reason: "multiple catalog schemas share this fileMatch glob; add an explicit mapping",
              schemaIds: ["web-manifest"],
            },
          ],
          globs: ["**/manifest.json", "**/web.json"],
          validators,
        },
        fileMatch: ["manifest.json", "web.json"],
        id: "web-manifest",
      },
      {
        covering: { globs: ["**/manifest.json"], validators },
        fileMatch: ["manifest.json"],
        id: "extension-manifest",
      },
    ];
    const result = buildCoveringData(patterns, validators);
    const collision = {
      glob: "**/manifest.json",
      reason: "multiple catalog schemas share this fileMatch glob; add an explicit mapping",
      schemaIds: ["extension-manifest", "web-manifest"],
    };

    expect(result.globs).toEqual(["**/web.json"]);
    expect(result.covering["web-manifest"]?.excluded).toEqual([collision]);
    expect(result.covering["extension-manifest"]?.excluded).toEqual([collision]);
  });
});

describe("v3 validator metadata", () => {
  const schemaDigest = `sha256:${"a".repeat(64)}`;
  const settingsDigest = `sha256:${"b".repeat(64)}`;
  const toolHash = `sha256:${"c".repeat(64)}`;
  const adapterHash = `${toolHash}:${toolHash}`;
  const validators = ["sourcemeta", "check-jsonschema", "ajv"];

  it("uses Schepherd's platform covering globs and retains source metadata", () => {
    const patterns = [
      {
        covering: {
          globs: ["**/config.json", "**/*.yaml"],
          recordedExcluded: [{ processor: "ajv", reason: "unsupported dialect" }],
          recordedSupported: ["sourcemeta", "check-jsonschema"],
          validators,
        },
        fileMatch: ["config.json"],
        id: "example",
        metadata: {
          profiles: [
            {
              processor: "sourcemeta",
              result: "supported" as const,
              settingsDigest,
              tool: toolHash,
            },
            {
              processor: "check-jsonschema",
              result: "supported" as const,
              settingsDigest,
              tool: adapterHash,
            },
            {
              processor: "ajv",
              reason: "unsupported dialect",
              result: "unsupported" as const,
              settingsDigest,
              tool: adapterHash,
            },
          ],
          schemaDigest,
        },
        sourceFormats: [{ extensions: [".json"], filenames: ["config.json"], format: "json" }],
      },
    ];

    expect(buildCoveringGlobs(patterns, validators)).toEqual(["**/*.yaml", "**/config.json"]);
    expect(buildValidatorMetadata(patterns)).toEqual({
      metadata: { example: patterns[0]!.metadata },
      sourceFormats: { example: patterns[0]!.sourceFormats },
    });
  });

  it("rejects missing covering results and unsupported reasons", () => {
    expect(() => buildCoveringGlobs([{ fileMatch: [], id: "broken" }], validators)).toThrow(
      /covering metadata/,
    );
    expect(() =>
      buildValidatorMetadata([
        {
          covering: { globs: [], validators },
          fileMatch: [],
          id: "broken",
          metadata: {
            profiles: [
              { processor: "sourcemeta", result: "supported", settingsDigest, tool: toolHash },
              {
                processor: "check-jsonschema",
                result: "supported",
                settingsDigest,
                tool: adapterHash,
              },
              { processor: "ajv", result: "unsupported", settingsDigest, tool: adapterHash },
            ],
            schemaDigest,
          },
          sourceFormats: [],
        },
      ]),
    ).toThrow(/unsupported reason/);
  });
  it("rejects non-digest processor identities", () => {
    expect(() =>
      buildValidatorMetadata([
        {
          fileMatch: [],
          id: "bad-tool",
          metadata: {
            profiles: [
              { processor: "sourcemeta", result: "supported", settingsDigest, tool: "sourcemeta" },
              {
                processor: "check-jsonschema",
                result: "supported",
                settingsDigest,
                tool: adapterHash,
              },
              { processor: "ajv", result: "supported", settingsDigest, tool: adapterHash },
            ],
            schemaDigest,
          },
          sourceFormats: [],
        },
      ]),
    ).toThrow(/invalid tool identity/);
  });
});

describe("v2 runtime coverage", () => {
  const validators = ["sourcemeta", "check-jsonschema", "ajv"];
  it("uses runtime covering results when a v2 catalog has no compatibility metadata", () => {
    const patterns = [
      {
        covering: {
          globs: ["**/legacy.json"],
          recordedExcluded: [],
          recordedSupported: [],
          validators,
        },
        fileMatch: ["legacy.json"],
        id: "legacy",
      },
    ];

    expect(buildCoveringGlobs(patterns, validators)).toEqual(["**/legacy.json"]);
    expect(() => buildValidatorMetadata(patterns)).toThrow(/incomplete catalog metadata/);
  });
});
