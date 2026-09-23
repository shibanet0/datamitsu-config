import { describe, expect, it } from "vitest";

import { defineConfig } from "../index";

describe("defineConfig", () => {
  const hasJsonOverride = (config: ReturnType<typeof defineConfig>) =>
    (config.overrides ?? []).some((override) => String(override.files).includes("json"));

  /**
   * A caller naming `overrides` must not drop `jsonAlwaysExpandedOverride` with it.
   */
  it("keeps the base overrides when the caller adds one", () => {
    const extended = defineConfig({
      overrides: [{ files: ["*.md"], options: { printWidth: 80 } }],
    });

    expect(hasJsonOverride(extended)).toBe(true);
    expect(extended.overrides).toHaveLength((defineConfig().overrides?.length ?? 0) + 1);
  });

  it("lets the function form replace wholesale", () => {
    expect(defineConfig((base) => ({ ...base, overrides: [] })).overrides).toEqual([]);
  });

  /**
   * `svelte` is on for everyone — the managed app ships `svelte/compiler` — and a caller can still
   * turn it off, which is also the check that the merge does not swallow a `false`.
   */
  it("formats svelte by default and lets a project decline", () => {
    expect(defineConfig().svelte).toBe(true);
    expect(defineConfig({ svelte: false }).svelte).toBe(false);
  });

  /**
   * `jsdoc` is `boolean | JsdocConfig`, so the object-merge branch has to check the shape before
   * spreading — `jsdoc: false` means off, not "merge into a boolean".
   */
  it("treats a boolean jsdoc as a replacement rather than a merge", () => {
    expect(defineConfig({ jsdoc: false }).jsdoc).toBe(false);
    expect(defineConfig({ jsdoc: { addDefaultToDescription: false } }).jsdoc).toMatchObject({
      addDefaultToDescription: false,
      commentLineStrategy: "multiline",
    });
  });
});
