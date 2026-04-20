import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const taskfileContent = readFileSync(join(import.meta.dirname, "../../Taskfile.yaml"), "utf8");

describe("Taskfile.yaml docs tasks", () => {
  it("should be valid YAML (no duplicate keys or syntax errors in task definitions)", () => {
    expect(taskfileContent).toContain("tasks:");
    expect(taskfileContent).toContain('version: "3"');
  });

  it("should contain docs:generate:tools task with desc", () => {
    expect(taskfileContent).toContain("docs:generate:tools:");
    expect(taskfileContent).toMatch(
      /docs:generate:tools:[\s\S]*?desc:.*Generate docs\/reference\/tools\.md/,
    );
  });

  it("should contain docs:generate umbrella task with desc", () => {
    expect(taskfileContent).toMatch(/docs:generate:\n\s+(?:deps|desc):/);
    expect(taskfileContent).toMatch(/docs:generate:[\s\S]*?desc:.*Generate all documentation/);
  });

  it("docs:generate should depend on docs:generate:tools", () => {
    // Match multi-line array format: deps:\n    [\n      docs:generate:tools,
    expect(taskfileContent).toMatch(/docs:generate:\s+deps:[\s\S]*?docs:generate:tools/);
  });

  it("docs:generate:tools should run node scripts/generate-docs-tools.ts", () => {
    expect(taskfileContent).toContain("node scripts/generate-docs-tools.ts");
  });

  it("all task definitions should have desc fields", () => {
    const taskMatches = taskfileContent.matchAll(/^ {2}([\w:.-]+):\s*\n((?:^ {4,}.+\n|\s*\n)*)/gm);
    for (const match of taskMatches) {
      const taskName = match[1]!;
      const taskBody = match[2]!;
      if (["tasks", "version"].includes(taskName)) {
        continue;
      }
      expect(taskBody, `Task '${taskName}' should have a desc field`).toContain("desc:");
    }
  });
});
