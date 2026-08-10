import { describe, expect, it } from "vitest";

import { sortDocument } from "../sort";

/**
 * Extract the command names of a hook in file order.
 */
const orderOf = (yaml: string, hook: string): string[] => {
  const body = yaml.split(`${hook}:`)[1] ?? "";
  return [...body.matchAll(/^ {4}([\w -]+):$/gm)].map((m) => m[1] ?? "");
};

/**
 * Extract the top-level keys in file order.
 */
const topLevelKeys = (yaml: string): string[] =>
  [...yaml.matchAll(/^([\w-]+):/gm)].map((m) => m[1] ?? "");

describe("sortDocument", () => {
  it("orders top-level hooks by the git lifecycle, not alphabetically", () => {
    const out = sortDocument(
      [
        "post-checkout:",
        "  commands:",
        "    a:",
        "      run: echo a",
        "commit-msg:",
        "  commands:",
        "    b:",
        "      run: echo b",
        "pre-commit:",
        "  commands:",
        "    c:",
        "      run: echo c",
        "",
      ].join("\n"),
    );
    // lifecycle order: pre-commit → commit-msg → post-checkout
    expect(topLevelKeys(out)).toEqual(["pre-commit", "commit-msg", "post-checkout"]);
  });

  it("keeps non-hook global settings above the hooks, in their original order", () => {
    const out = sortDocument(
      [
        "post-checkout:",
        "  commands:",
        "    a:",
        "      run: echo a",
        "min_version: 1.5.0",
        "pre-commit:",
        "  commands:",
        "    b:",
        "      run: echo b",
        "extends:",
        "  - remote.yml",
        "",
      ].join("\n"),
    );
    // non-hook keys (min_version, extends) stay first in original order; hooks follow by lifecycle
    expect(topLevelKeys(out)).toEqual(["min_version", "extends", "pre-commit", "post-checkout"]);
  });
  it("orders commands by ascending priority", () => {
    const out = sortDocument(
      [
        "pre-commit:",
        "  commands:",
        "    c:",
        "      priority: 30",
        "    a:",
        "      priority: 10",
        "    b:",
        "      priority: 20",
        "",
      ].join("\n"),
    );
    expect(orderOf(out, "pre-commit")).toEqual(["a", "b", "c"]);
  });

  it("treats priority 0 as +Infinity (runs last), like lefthook", () => {
    const out = sortDocument(
      [
        "pre-commit:",
        "  commands:",
        "    zeroed:",
        "      priority: 0",
        "    first:",
        "      priority: 1",
        "",
      ].join("\n"),
    );
    // priority 0 must sort AFTER priority 1, not before it.
    expect(orderOf(out, "pre-commit")).toEqual(["first", "zeroed"]);
  });

  it("sorts commands without a priority last, tie-broken by name", () => {
    const out = sortDocument(
      [
        "pre-commit:",
        "  commands:",
        "    zebra:",
        "      run: echo z",
        "    alpha:",
        "      run: echo a",
        "    prioritised:",
        "      priority: 5",
        "",
      ].join("\n"),
    );
    expect(orderOf(out, "pre-commit")).toEqual(["prioritised", "alpha", "zebra"]);
  });

  it("preserves comments attached to reordered commands", () => {
    const out = sortDocument(
      [
        "pre-commit:",
        "  commands:",
        "    early:",
        "      priority: 10",
        "    # keep me with late",
        "    late:",
        "      priority: 20",
        "",
      ].join("\n"),
    );
    expect(out).toContain("# keep me with late");
    // the comment stays immediately above its command
    expect(out).toMatch(/# keep me with late\n {4}late:/);
  });

  it("is idempotent for an already-ordered document", () => {
    const input = [
      "pre-commit:",
      "  commands:",
      "    a:",
      "      priority: 10",
      "    b:",
      "      priority: 20",
      "",
    ].join("\n");
    expect(sortDocument(sortDocument(input))).toBe(sortDocument(input));
  });

  it("leaves documents without a commands map untouched", () => {
    const input = "pre-commit:\n  parallel: false\n";
    expect(sortDocument(input)).toBe(input);
  });
});
