import { describe, expect, it } from "vitest";

import { resolveDatamitsuConfigVersion } from "../config-version";

describe("resolveDatamitsuConfigVersion", () => {
  it("defaults local bundles to dev without reading a release version", () => {
    expect(resolveDatamitsuConfigVersion({}, "0.0.3-alpha-28")).toBe("dev");
  });

  it("embeds a release or core display label only when it matches the package manifest", () => {
    expect(
      resolveDatamitsuConfigVersion(
        { DATAMITSU_CONFIG_VERSION: "0.0.3-alpha-28" },
        "0.0.3-alpha-28",
      ),
    ).toBe("0.0.3-alpha-28");
  });

  it("accepts the explicit core label when the package manifest matches", () => {
    expect(resolveDatamitsuConfigVersion({ DATAMITSU_CONFIG_VERSION: "core" }, "core")).toBe(
      "core",
    );
  });
  it("rejects an explicit dev label for a release build", () => {
    expect(() =>
      resolveDatamitsuConfigVersion({ DATAMITSU_CONFIG_VERSION: "dev" }, "0.0.3-alpha-28"),
    ).toThrow("valid release version");
  });

  it.each(["", " release", "release ", "release\nother", "x".repeat(81)])(
    "rejects invalid release label %j",
    (value) => {
      expect(() =>
        resolveDatamitsuConfigVersion({ DATAMITSU_CONFIG_VERSION: value }, "0.0.3-alpha-28"),
      ).toThrow("DATAMITSU_CONFIG_VERSION");
    },
  );

  it("rejects a release label that differs from package.json", () => {
    expect(() =>
      resolveDatamitsuConfigVersion(
        { DATAMITSU_CONFIG_VERSION: "0.0.3-alpha-29" },
        "0.0.3-alpha-28",
      ),
    ).toThrow("does not match package.json");
  });
});
