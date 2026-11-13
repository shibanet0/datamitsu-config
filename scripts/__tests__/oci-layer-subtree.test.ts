import { describe, expect, it } from "vitest";

import { resolveLayerSubtree } from "../lib/oci-layer-subtree.ts";

const identity = "a".repeat(32);

describe("Python OCI layer ownership", () => {
  it.each(["uv", "uv-python314"])("annotates the exact interpreter target for %s", (runtime) => {
    const entry = { kind: "python-data", subtree: `.runtime-data/${runtime}` };
    const root = `dm/store/${entry.subtree}/${identity}`;
    const names = [`${root}/`, `${root}/python/`, `${root}/python/bin/python3`];
    const target = names
      .map((name) => resolveLayerSubtree(entry, "dm/store", name))
      .find((value) => value !== undefined);

    expect(target).toBe(`${entry.subtree}/${identity}/python`);
  });

  it("does not annotate an identity directory or a tool cache as an interpreter", () => {
    const entry = { kind: "python-data", subtree: ".runtime-data/uv" };
    expect(
      resolveLayerSubtree(entry, "dm/store", `dm/store/.runtime-data/uv/${identity}/`),
    ).toBeUndefined();
    expect(
      resolveLayerSubtree(entry, "dm/store", `dm/store/.runtime-data/uv/${identity}/cache/`),
    ).toBeUndefined();
  });

  it("requires a valid identity and an exact python path component", () => {
    const entry = { kind: "python-data", subtree: ".runtime-data/uv" };
    expect(
      resolveLayerSubtree(entry, "dm/store", "dm/store/.runtime-data/uv/not-an-identity/python/"),
    ).toBeUndefined();
    expect(
      resolveLayerSubtree(entry, "dm/store", `dm/store/.runtime-data/uv/${identity}/python-cache/`),
    ).toBeUndefined();
  });
});
