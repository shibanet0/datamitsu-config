import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { toolsConfig } from "../tools.js";

interface ConfigArg {
  key: string;
  operation: string;
  tool: string;
}

type ManagedConfigs = typeof import("../cmd-managed-configs.js").managedConfigs;

const placeholder = (key: string) => `{managedConfig:${key}}`;

const referencedKeys = (value: string): string[] =>
  [...value.matchAll(/\{managedConfig:([^{}\s]+)\}/gu)].map((match) => match[1]!);

const configArgs = (): ConfigArg[] =>
  Object.entries(toolsConfig).flatMap(([tool, definition]) =>
    Object.entries(definition.operations).flatMap(([operation, op]) =>
      [...(op.args ?? []), ...Object.values(op.env ?? {})]
        .flatMap(referencedKeys)
        .map((key) => ({ key, operation, tool })),
    ),
  );

// The files a project keeps outside the repository until it ejects them: each tool is handed the
// path explicitly, and nothing else — no editor extension, hook or CI action this configuration
// sets up — finds the file by name.
const EJECTABLE = [
  ".alint.yml",
  ".dclint.yaml",
  ".editorconfig-checker.json",
  ".gitleaks.toml",
  ".ls-lint.yml",
  ".sqruff",
  ".trufflehog-exclude-paths.txt",
  ".vale.ini",
  ".yamlfmt.yaml",
  ".yamllint.yaml",
  "droast.toml",
  "hadolint.yaml",
  "mdsf.json",
];

describe("tool config paths", () => {
  let managedConfigs: ManagedConfigs;

  beforeAll(async () => {
    // cmd-managed-configs pulls in apps.ts, which reads these goja globals at module load.
    vi.stubGlobal("YAML", { stringify: () => "" });
    vi.stubGlobal("pnpmWorkspaceDefaults", {});
    ({ managedConfigs } = await import("../cmd-managed-configs.js"));
  });

  afterAll(() => vi.unstubAllGlobals());

  /**
   * Discovery is not a substitute: sqruff and mdsf look only in the working directory, so a run
   * started anywhere else fell back to defaults, and a missing file read as an empty config. Named
   * explicitly, a missing file is an error in all six.
   */
  it.each([
    ["alint", "--config", ".alint.yml"],
    ["editorconfig-checker", "-config", ".editorconfig-checker.json"],
    ["mdsf", "--config", "mdsf.json"],
    ["pinact", "--config", ".pinact.yaml"],
    ["sqruff", "--config", ".sqruff"],
    ["zizmor", "--config", ".github/zizmor.yml"],
  ])("%s passes %s %s to every operation", (tool, flag, key) => {
    for (const [operation, op] of Object.entries(toolsConfig[tool]!.operations)) {
      const args = op.args ?? [];
      const index = args.indexOf(placeholder(key));
      expect(index, operation).toBeGreaterThan(0);
      expect(args[index - 1], operation).toBe(flag);
    }
    expect(managedConfigs[key]?.scope).toBe("git-root");
  });

  it("names managed configs only through the placeholder, and only ones the tool owns", () => {
    for (const [tool, definition] of Object.entries(toolsConfig)) {
      for (const [operation, op] of Object.entries(definition.operations)) {
        for (const arg of op.args ?? []) {
          const match = /^\{(?:root|cwd)\}\/(.+)$/u.exec(arg);
          const bypasses = match !== null && managedConfigs[match[1]!] !== undefined;
          expect(bypasses, `${tool} ${operation}: ${arg} bypasses {managedConfig:}`).toBe(false);
        }
      }
    }
    for (const { key, operation, tool } of configArgs()) {
      expect(managedConfigs[key], `${tool} ${operation} → ${key}`).toBeDefined();
      expect(managedConfigs[key]!.tools, `${tool} ${operation} → ${key}`).toContain(tool);
    }
  });

  it("generates a project-scoped config in every project type the tool runs in", () => {
    // oxlint.config.mts imports ./package.json, which a tsconfig-only directory does not have;
    // see docs/backlog/tsconfig-only-project-gets-a-run-but-no-config.md.
    const knownGaps = new Set(["oxlint"]);
    const projectArgs = configArgs().filter(
      ({ key, tool }) => managedConfigs[key]!.scope !== "git-root" && !knownGaps.has(tool),
    );
    expect(projectArgs.map(({ tool }) => tool)).toContain("prettier");

    for (const { key, tool } of projectArgs) {
      const configTypes = managedConfigs[key]!.projectTypes;
      if (configTypes === undefined) {
        continue;
      }
      const toolTypes = toolsConfig[tool]!.projectTypes;
      expect(toolTypes, `${tool} runs in every project type`).toBeDefined();
      expect(configTypes, `${key} for ${tool}`).toEqual(expect.arrayContaining(toolTypes!));
    }
  });

  it("marks exactly the relocatable files ejectable", () => {
    const ejectable = Object.entries(managedConfigs)
      .filter(([, entry]) => entry.ejectable)
      .map(([key]) => key)
      .sort();
    expect(ejectable).toEqual([...EJECTABLE].sort());
  });

  it.each(EJECTABLE)("%s is read only through the path its tool is given", (key) => {
    const entry = managedConfigs[key]!;
    expect(entry.scope).toBe("git-root");
    expect(entry.content).toBeTypeOf("function");
    const readers = configArgs().filter((arg) => arg.key === key);
    for (const tool of entry.tools ?? []) {
      expect(
        readers.some((arg) => arg.tool === tool),
        `${tool} must receive {managedConfig:${key}}`,
      ).toBe(true);
    }
  });

  it("leaves .sqruffignore alone: it is sqruff's ignore file, not another name for .sqruff", () => {
    expect(managedConfigs[".sqruff"]!.otherFileNameList ?? []).not.toContain(".sqruffignore");
  });
});
