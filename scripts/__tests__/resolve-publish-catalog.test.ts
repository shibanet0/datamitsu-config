import { describe, expect, it } from "vitest";

import { resolvePublishCatalog } from "../resolve-publish-catalog.ts";

describe("resolvePublishCatalog", () => {
  it("replaces default catalog specifiers with publishable versions", () => {
    const manifest = {
      dependencies: { "@datamitsu/datamitsu": "catalog:" },
      peerDependencies: { typescript: "catalog:default" },
    };

    expect(
      resolvePublishCatalog(manifest, {
        catalog: { "@datamitsu/datamitsu": "0.4.1", typescript: "6.0.3" },
      }),
    ).toEqual({
      dependencies: { "@datamitsu/datamitsu": "0.4.1" },
      peerDependencies: { typescript: "6.0.3" },
    });
  });

  it("rejects a catalog dependency missing from the workspace", () => {
    expect(() =>
      resolvePublishCatalog({ dependencies: { missing: "catalog:" } }, { catalog: {} }),
    ).toThrow("Could not resolve missing@catalog: from the default pnpm catalog");
  });
});
