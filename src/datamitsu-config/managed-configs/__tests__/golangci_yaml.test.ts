import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import { golangciYaml } from "../_golangci_yaml";

describe("golangci managed config", () => {
  beforeEach(() => {
    vi.stubGlobal("YAML", { parse, stringify });
    vi.stubGlobal(
      "merge",
      (base: Record<string, unknown>, ...overrides: Record<string, unknown>[]) =>
        Object.assign({}, base, ...overrides),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = (originalContent: string) =>
    parse(
      golangciYaml.content!({ originalContent } as Parameters<
        NonNullable<typeof golangciYaml.content>
      >[0])!,
    );

  it("migrates legacy linter names and supported settings into the enabled v5 linter", () => {
    const config = render(
      `linters:\n  enable: [exhaustruct, exhaustruct]\n  disable: [exhaustruct]\n  exclusions:\n    rules:\n      - linters: [exhaustruct, exhaustruct]\n        path: internal\\.go\n  settings:\n    exhaustruct:\n      include: [Foo]\n      exclude: [Generated]\n      allow-empty-rx: [Empty]\n      allow-empty: true\n      allow-empty-returns: true\n      allow-empty-declarations: true\n    exhaustruct_v5:\n      enforce-patterns: [Bar]\n      ignore-patterns: [Internal]\n`,
    );

    expect(config.linters.enable).toContain("exhaustruct_v5");
    expect(config.linters.enable).not.toContain("exhaustruct");
    expect(config.linters.disable).not.toContain("exhaustruct");
    expect(config.linters.disable).not.toContain("exhaustruct_v5");
    expect(config.linters.enable.filter((name: string) => name === "exhaustruct_v5")).toHaveLength(
      1,
    );
    expect(config.linters.exclusions.rules[0].linters).toEqual([
      "exhaustruct_v5",
      "exhaustruct_v5",
    ]);
    expect(config.linters.settings.exhaustruct_v5).toEqual({
      "allow-empty": true,
      "allow-empty-declarations": true,
      "allow-empty-patterns": ["Empty"],
      "allow-empty-returns": true,
      "enforce-patterns": ["Bar"],
      "explicit-mode": true,
      "ignore-patterns": ["Internal"],
    });
    expect(config.linters.settings).not.toHaveProperty("exhaustruct");
    for (const legacyKey of ["include", "exclude", "allow-empty-rx"]) {
      expect(config.linters.settings.exhaustruct_v5).not.toHaveProperty(legacyKey);
    }
  });

  it("is idempotent and preserves project v5 settings", () => {
    const first = stringify(
      render(
        `linters:\n  enable: [exhaustruct_v5]\n  settings:\n    exhaustruct_v5:\n      ignore-patterns: [Internal]\n`,
      ),
    );
    const second = stringify(render(first));

    expect(second).toBe(first);
    expect(parse(second).linters.settings.exhaustruct_v5["ignore-patterns"]).toEqual(["Internal"]);
  });

  it("enables explicit mode only when migrating a legacy include", () => {
    const config = render(`linters:\n  settings:\n    exhaustruct:\n      exclude: [Generated]\n`);

    expect(config.linters.settings.exhaustruct_v5).toEqual({ "ignore-patterns": ["Generated"] });
  });
  it("keeps implicit mode when a legacy include list is empty", () => {
    const config = render(`linters:\n  settings:\n    exhaustruct:\n      include: []\n`);

    expect(config.linters.settings.exhaustruct_v5).toEqual({ "enforce-patterns": [] });
  });

  it("lets explicit v5 mode override migrated legacy include semantics", () => {
    const config = render(
      `linters:\n  settings:\n    exhaustruct:\n      include: [Legacy]\n    exhaustruct_v5:\n      explicit-mode: false\n`,
    );

    expect(config.linters.settings.exhaustruct_v5).toEqual({
      "enforce-patterns": ["Legacy"],
      "explicit-mode": false,
    });
  });
});
