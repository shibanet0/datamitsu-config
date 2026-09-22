import type { Config } from "stylelint";

import { describe, expect, it } from "vitest";

import { mergeConfig } from "../merge";

/**
 * The object form of `defineConfig` adds to the base; only the function form replaces it.
 *
 * Everything that makes a component parse lives in `overrides`, so a spread turned the most
 * ordinary consumer config — one entry adjusting one file type — into three languages that no
 * longer parse. These pin the merge rather than the rule set: what matters is that naming one key
 * cannot silently remove another.
 *
 * The base here mirrors the real one's shape rather than importing it: `index.ts` resolves every
 * preset to an absolute path inside the managed app's install, which does not exist in this
 * repository.
 */
describe("mergeConfig", () => {
  const base: Config = {
    extends: ["/store/stylelint-config-standard"],
    overrides: [
      { extends: ["/store/stylelint-config-standard-scss"], files: ["**/*.scss"] },
      { extends: ["/store/stylelint-config-html/svelte"], files: ["**/*.svelte"] },
    ],
    reportUnscopedDisables: true,
    rules: { "color-hex-length": "short" },
  };

  it("keeps the base overrides when the caller adds one", () => {
    const merged = mergeConfig(base, {
      overrides: [{ files: ["**/*.css"], rules: { "color-hex-length": null } }],
    });

    expect(merged.overrides).toHaveLength(3);
    expect(String(merged.overrides?.[1]?.files)).toContain("svelte");
    // Last wins in stylelint, so appending is what makes the caller's entry decide.
    expect(merged.overrides?.at(-1)?.rules).toEqual({ "color-hex-length": null });
  });

  it("keeps the base overrides and options when the caller only names rules", () => {
    const merged = mergeConfig(base, { rules: { "selector-class-pattern": null } });

    expect(merged.overrides).toHaveLength(2);
    expect(merged.reportUnscopedDisables).toBe(true);
    expect(merged.rules).toEqual({
      "color-hex-length": "short",
      "selector-class-pattern": null,
    });
  });

  it("appends extends, accepting the string form stylelint also allows", () => {
    expect(mergeConfig(base, { extends: "my-preset" }).extends).toEqual([
      "/store/stylelint-config-standard",
      "my-preset",
    ]);
  });

  it("returns the base untouched when there is nothing to merge", () => {
    expect(mergeConfig(base)).toBe(base);
  });
});
