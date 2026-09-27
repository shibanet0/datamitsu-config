import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { droastToml, plainKeysFirst } from "../droast_toml";

/**
 * Datamitsu's `TOML.parse` returns keys sorted and its `TOML.stringify` keeps the order it is
 * given, so the stub does the same: it hands back the parsed object with sorted keys and records
 * the key order it was asked to write.
 */
const parsed = {
  "fail-on": "info",
  "no-roast": true,
  overrides: [{ paths: ["docker/Dockerfile"], skip: ["DF012"] }],
  "report-unused-suppressions": true,
};

describe("droast configuration", () => {
  beforeEach(() => {
    vi.stubGlobal("TOML", {
      parse: () => structuredClone(parsed),
      stringify: (value: Record<string, unknown>) => JSON.stringify(Object.keys(value)),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("writes every policy key before the project's [[overrides]]", () => {
    const keys = JSON.parse(
      droastToml.content!({ originalContent: "ignored" } as never)!,
    ) as string[];

    expect(keys.at(-1)).toBe("overrides");
    expect(keys.slice(0, -1)).toEqual(
      expect.arrayContaining([
        "fail-on",
        "no-roast",
        "report-unused-suppressions",
        "require-suppression-expiration",
        "require-suppression-reason",
      ]),
    );
  });
});

describe("plainKeysFirst", () => {
  it("moves tables and arrays of tables after the plain keys, keeping each group's order", () => {
    const ordered = plainKeysFirst({
      a: 1,
      labels: { team: "x" },
      m: ["DF012"],
      overrides: [{ skip: ["DF012"] }],
      z: true,
    });

    expect(Object.keys(ordered)).toEqual(["a", "m", "z", "labels", "overrides"]);
  });

  it("keeps an empty array with the plain keys", () => {
    expect(Object.keys(plainKeysFirst({ overrides: [], z: true }))).toEqual(["overrides", "z"]);
  });
});
