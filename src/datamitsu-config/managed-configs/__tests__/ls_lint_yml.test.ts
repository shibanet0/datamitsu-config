import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import { lsLintYml } from "../_ls_lint_yml";
import { resolve } from "../../../ignore/profile";
import { lsLintProfile } from "../../../ignore/profiles/ls-lint";
import {
  buildManagedLsLintYaml,
  expandToDepth,
  LS_LINT_IGNORE_DEPTH,
} from "../../ls-lint-defaults";
import { toolsConfig } from "../../tools";

const render = (originalContent: string) => lsLintYml.content!({ originalContent } as never)!;
const directoryRule = String.raw`kebab-case | snake_case | camelCase | PascalCase | regex:\.[a-z0-9_-]+ | regex:__[a-z0-9]+__ | regex:\[{1,2}(\.\.\.)?[a-zA-Z0-9-]+\]{1,2} | regex:\(\$?[a-zA-Z0-9-]+\) | regex:\{-?\$[a-zA-Z0-9]+\} | regex:\$[a-zA-Z0-9]* | regex:@[a-z0-9-]+ | regex:[a-zA-Z0-9._-]+-snapshots | regex:(\(\.{1,3}\))+[a-zA-Z0-9\[\]._-]+`;

describe("ls-lint configuration", () => {
  beforeEach(() => vi.stubGlobal("YAML", { parse, stringify }));
  afterEach(() => vi.unstubAllGlobals());

  it("renders the catalog profile into the managed base, one brace group per depth", () => {
    const names = resolve(lsLintProfile).map((pattern) => pattern.slice("**/".length));
    const group = `{${names.join(",")}}`;
    expect(parse(buildManagedLsLintYaml())).toEqual({
      ignore: [group, `*/${group}`, `*/*/${group}`, `*/*/*/${group}`],
      ls: { ".dir": directoryRule },
    });
    expect(LS_LINT_IGNORE_DEPTH).toBe(3);
  });

  it("expands only **/ patterns to fixed depths and keeps the rest as they are", () => {
    expect(expandToDepth(["**/a", "root-only", "**/b/c", "**/d-*"], 2)).toEqual([
      "{a,b/c,d-*}",
      "*/{a,b/c,d-*}",
      "*/*/{a,b/c,d-*}",
      "root-only",
    ]);
    expect(expandToDepth(["**/a"], 1)).toEqual(["a", "*/a"]);
    expect(expandToDepth(["x"], 3)).toEqual(["x"]);
  });

  it.each([
    ["(.)photo", true],
    ["(..)photo", true],
    ["(..)(..)photo", true],
    ["(...)photo", true],
    ["(..)[id]", true],
    ["[slug]", true],
    ["(marketing)", true],
    ["@modal", true],
    ["index.test.ts-snapshots", true],
    [".mypy_cache", true],
    [".ruff_cache", true],
    ["$postId", true],
    ["$", true],
    ["($lang)", true],
    ["{-$locale}", true],
    ["mixed_name-dev", false],
  ])("the directory regexes accept %s: %s", (name, allowed) => {
    const regexes = directoryRule
      .split(" | ")
      .filter((rule) => rule.startsWith("regex:"))
      .map((rule) => new RegExp(`^${rule.slice("regex:".length)}$`, "u"));
    expect(regexes.some((regex) => regex.test(name))).toBe(allowed);
  });

  it("never emits a ** pattern", () => {
    for (const pattern of parse(buildManagedLsLintYaml()).ignore as string[]) {
      expect(pattern).not.toContain("**");
    }
  });

  it("refuses alternatives that would break the brace group", () => {
    for (const bad of ["**/a,b", "**/{a,b}", "**/a}"]) {
      expect(() => expandToDepth(["**/ok", bad], 1)).toThrow(/brace/);
    }
  });

  it("layers both root configs in the opt-in repository walk", () => {
    expect(toolsConfig["ls-lint"]).toMatchObject({
      operations: {
        lint: {
          args: [
            "-config",
            "{root}/.datamitsu/ls-lint-managed.yml",
            "-config",
            "{root}/.ls-lint.yml",
          ],
          globs: ["**/*"],
          scope: "repository",
        },
      },
      skip: true,
    });
  });

  it("emits an empty user rule map when no file exists", () => {
    expect(parse(render(""))).toEqual({ ls: {} });
    expect(render(render(""))).toBe(render(""));
  });

  it("migrates only the exact legacy defaults and is idempotent", () => {
    const result = render(
      stringify({
        ignore: [".git", "node_modules", "dist"],
        ls: { ".dir": "kebab-case | snake_case" },
      }),
    );
    expect(parse(result)).toEqual({ ls: {} });
    expect(render(result)).toBe(result);
  });

  it("preserves custom rules, nested blocks and exclusions", () => {
    const custom = {
      ignore: ["dist", "node_modules", ".git", "custom"],
      ls: { ".dir": "camelCase", ".ts": "camelCase", "src/**": { ".ts": "snake_case" } },
    };
    const result = render(stringify(custom));
    expect(parse(result)).toEqual(custom);
    expect(render(result)).toBe(result);
  });

  it("preserves reordered legacy exclusions and near-default directory rules", () => {
    const custom = {
      ignore: ["dist", "node_modules", ".git"],
      ls: { ".dir": "snake_case | kebab-case" },
    };
    expect(parse(render(stringify(custom)))).toEqual(custom);
  });

  it("removes legacy defaults independently of custom settings", () => {
    expect(
      parse(
        render(
          stringify({
            ignore: ["custom"],
            ls: { ".dir": "kebab-case | snake_case", ".ts": "camelCase" },
          }),
        ),
      ),
    ).toEqual({ ignore: ["custom"], ls: { ".ts": "camelCase" } });
    expect(
      parse(
        render(
          stringify({ ignore: [".git", "node_modules", "dist"], ls: { ".dir": "camelCase" } }),
        ),
      ),
    ).toEqual({ ls: { ".dir": "camelCase" } });
  });

  it("explains layering in the generated file", () => {
    const result = render("");
    expect(result).toContain(".datamitsu/ls-lint-managed.yml");
    expect(result).not.toContain("reconcile");
    expect(result).toContain("replaces");
    expect(result).toContain(String.raw`regex:\.[a-z0-9_-]+`);
    expect(result).toContain("ignore adds");
  });
});
