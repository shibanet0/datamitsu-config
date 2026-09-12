import { beforeAll, describe, expect, it } from "vitest";

import { githubDependabotYml } from "../_github_dependabot_yml.js";

interface Loc {
  path: string;
  type: string;
}

// The goja YAML global isn't available under vitest. Stub it with a JSON
// round-trip so we can exercise the merge/policy logic and read the result back.
const generate = (originalContent?: string, projectLocations: Loc[] = []): string | undefined =>
  githubDependabotYml.content!({ originalContent, projectLocations } as never);

const render = (
  originalContent?: string,
  projectLocations: Loc[] = [],
): Record<string, any> | undefined => {
  const out = generate(originalContent, projectLocations);
  if (out === undefined) {
    return;
  }
  return JSON.parse(out) as Record<string, any>;
};

const entriesFor = (result: Record<string, any>, ecosystem: string): Record<string, any>[] =>
  (result.updates as Record<string, any>[]).filter((u) => u["package-ecosystem"] === ecosystem);

const entryFor = (
  result: Record<string, any>,
  ecosystem: string,
): Record<string, any> | undefined => entriesFor(result, ecosystem)[0];

const dirsFor = (result: Record<string, any>, ecosystem: string): string[] =>
  entriesFor(result, ecosystem)
    .map((e) => e.directory as string)
    .sort();

describe("githubDependabotYml", () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>).YAML = {
      parse: (text: string) => (text ? JSON.parse(text) : undefined),
      stringify: (value: unknown) => JSON.stringify(value),
    };
  });

  describe("manage-if-present", () => {
    it("does not create the file when it is absent", () => {
      expect(generate()).toBeUndefined();
      expect(generate("")).toBeUndefined();
      expect(generate("   \n")).toBeUndefined();
    });

    it("manages the file once it exists", () => {
      const result = render(JSON.stringify({ version: 2 }), [{ path: ".", type: "npm-package" }]);
      expect(result).toBeDefined();
      expect(result!.version).toBe(2);
    });
  });

  describe("policy", () => {
    it("applies conventional commits, weekly schedule, grouping, and a PR cap", () => {
      const result = render(JSON.stringify({ updates: [], version: 2 }), [
        { path: ".", type: "npm-package" },
      ])!;

      const npm = entryFor(result, "npm")!;
      expect(npm.directory).toBe("/");
      expect(npm.schedule).toEqual({ interval: "weekly" });
      expect(npm["open-pull-requests-limit"]).toBe(10);
      expect(npm.groups).toEqual({ "all-dependencies": { patterns: ["*"] } });
      // include:scope yields chore(deps): / chore(deps-dev): — no prefix-development.
      expect(npm["commit-message"]).toEqual({ include: "scope", prefix: "chore" });
    });

    it("never sets versioning-strategy (left to Dependabot's default)", () => {
      const result = render(JSON.stringify({ version: 2 }), [
        { path: ".", type: "npm-package" },
        { path: ".", type: "rust-project" },
        { path: "infra", type: "terraform-project" },
        { path: "svc", type: "golang-package" },
      ])!;
      for (const entry of result.updates as Record<string, any>[]) {
        expect(entry["versioning-strategy"]).toBeUndefined();
      }
    });

    it("uses the ci prefix and root directory for github-actions", () => {
      const result = render(JSON.stringify({ version: 2 }), [
        { path: ".github/workflows", type: "github-actions" },
      ])!;

      const actions = entryFor(result, "github-actions")!;
      expect(actions.directory).toBe("/");
      expect(actions["commit-message"]).toEqual({ prefix: "ci" });
    });

    it("adds dependencies + docker labels for the docker ecosystem", () => {
      const result = render(JSON.stringify({ version: 2 }), [
        { path: ".", type: "docker-project" },
      ])!;
      expect(entryFor(result, "docker")!.labels).toEqual(["dependencies", "docker"]);
    });
  });

  describe("detection", () => {
    it("maps a nested module to its directory", () => {
      const result = render(JSON.stringify({ version: 2 }), [
        { path: "service/api", type: "golang-package" },
      ])!;
      expect(entryFor(result, "gomod")!.directory).toBe("/service/api");
    });

    it("ignores project types without a Dependabot ecosystem", () => {
      const result = render(JSON.stringify({ version: 2 }), [
        { path: ".", type: "typescript-project" },
        { path: ".", type: "helm-chart" },
      ])!;
      expect(result.updates).toEqual([]);
    });

    it("adds one entry per detected directory in a monorepo", () => {
      const result = render(JSON.stringify({ updates: [], version: 2 }), [
        { path: ".", type: "npm-package" },
        { path: "packages/a", type: "npm-package" },
        { path: "packages/b", type: "pnpm-package" },
      ])!;
      expect(dirsFor(result, "npm")).toEqual(["/", "/packages/a", "/packages/b"]);
    });
  });

  describe("user content", () => {
    it("adds detected directories the user has not yet listed for an ecosystem", () => {
      const result = render(
        JSON.stringify({
          updates: [{ directory: "/", "package-ecosystem": "npm" }],
          version: 2,
        }),
        [
          { path: ".", type: "npm-package" },
          { path: "packages/a", type: "npm-package" },
        ],
      )!;
      // The user's "/" is kept (not duplicated); "/packages/a" is added.
      expect(dirsFor(result, "npm")).toEqual(["/", "/packages/a"]);
    });

    it("does not second-guess directories when the user uses a directories glob", () => {
      const result = render(
        JSON.stringify({
          updates: [{ directories: ["/packages/*"], "package-ecosystem": "npm" }],
          version: 2,
        }),
        [
          { path: "packages/a", type: "npm-package" },
          { path: "packages/b", type: "npm-package" },
        ],
      )!;
      expect(entriesFor(result, "npm")).toHaveLength(1);
      expect(entryFor(result, "npm")!.directories).toEqual(["/packages/*"]);
    });

    it("preserves user-owned fields while overriding policy", () => {
      const result = render(
        JSON.stringify({
          updates: [
            {
              directory: "/",
              ignore: [{ "dependency-name": "left-pad" }],
              "open-pull-requests-limit": 99,
              "package-ecosystem": "npm",
              "target-branch": "develop",
            },
          ],
          version: 2,
        }),
      )!;

      const npm = entryFor(result, "npm")!;
      expect(npm.ignore).toEqual([{ "dependency-name": "left-pad" }]);
      expect(npm["target-branch"]).toBe("develop");
      expect(npm["open-pull-requests-limit"]).toBe(10);
    });

    it("preserves unknown top-level keys such as registries", () => {
      const result = render(
        JSON.stringify({
          registries: { "my-npm": { type: "npm-registry", url: "https://example.com" } },
          updates: [],
          version: 2,
        }),
        [{ path: ".", type: "npm-package" }],
      )!;
      expect(result.registries).toEqual({
        "my-npm": { type: "npm-registry", url: "https://example.com" },
      });
    });
  });

  it("is idempotent: re-running over its own output is a no-op", () => {
    const locs: Loc[] = [
      { path: ".", type: "npm-package" },
      { path: "packages/a", type: "npm-package" },
      { path: ".github/workflows", type: "github-actions" },
      { path: ".", type: "docker-project" },
    ];
    const first = generate(JSON.stringify({ version: 2 }), locs)!;
    const second = generate(first, locs)!;
    expect(second).toBe(first);
  });
});
