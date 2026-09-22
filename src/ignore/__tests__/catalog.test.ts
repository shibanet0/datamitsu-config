import { describe, expect, it } from "vitest";

import type { IgnoreEntry } from "../types";

import { resolve } from "../profile";

// Typed as a plain string map so tests can reference IDs the fixture does not define.
const entries: Record<string, IgnoreEntry> = {
  first: {
    git: "first/",
    glob: "**/first",
    kind: "build",
    negate: false,
    note: undefined,
    regex: "first$",
  },
  gitOnly: {
    git: ".env",
    glob: undefined,
    kind: "secret",
    negate: false,
    note: undefined,
    regex: undefined,
  },
  keep: {
    git: "keep/",
    glob: undefined,
    kind: "editor",
    negate: true,
    note: undefined,
    regex: undefined,
  },
  second: {
    git: "second/",
    glob: "**/second",
    kind: "cache",
    negate: false,
    note: undefined,
    regex: undefined,
  },
};

describe("ignore profile resolution", () => {
  it("preserves reference order and explicit spellings", () => {
    expect(
      resolve(
        { refs: ["second", { as: "first/**", id: "first" }, "second"], syntax: "glob" },
        entries,
      ),
    ).toEqual(["**/second", "first/**", "**/second"]);
  });

  it("preserves group order and emits explicit git negations", () => {
    const groups = Object.fromEntries([
      ["z", ["keep"]],
      ["a", ["second", "first"]],
    ]);
    const result = resolve({ groups, syntax: "gitignore" }, entries);
    expect(result).toEqual({ a: ["second/", "first/"], z: ["!keep/"] });
    expect(Object.keys(result)).toEqual(["z", "a"]);
  });

  it("resolves regex without modifying escapes", () => {
    expect(resolve({ refs: ["first"], syntax: "regex" }, entries)).toEqual(["first$"]);
  });

  it("rejects unknown IDs even with a spelling override", () => {
    expect(() => resolve({ refs: [{ as: "x", id: "missing" }], syntax: "glob" }, entries)).toThrow(
      /unknown.*missing/i,
    );
  });

  it("does not resolve inherited object properties as IDs", () => {
    expect(() => resolve({ refs: ["toString"], syntax: "glob" }, entries)).toThrow(
      /unknown.*toString/i,
    );
  });
  it.each(["glob", "regex"] as const)(
    "rejects negated entries in %s even with an override",
    (syntax) => {
      expect(() => resolve({ refs: [{ as: "keep", id: "keep" }], syntax }, entries)).toThrow(
        /negat/i,
      );
    },
  );

  it.each(["glob", "regex"] as const)("rejects missing %s spellings", (syntax) => {
    expect(() => resolve({ refs: ["gitOnly"], syntax }, entries)).toThrow(/spelling/i);
  });

  it("allows a profile to supply its missing syntax spelling", () => {
    expect(resolve({ refs: [{ as: "**/.env", id: "gitOnly" }], syntax: "glob" }, entries)).toEqual([
      "**/.env",
    ]);
  });
});
