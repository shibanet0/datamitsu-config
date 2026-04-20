import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const lefthookContent = readFileSync(join(import.meta.dirname, "../../lefthook.yaml"), "utf8");

describe("lefthook.yaml docs integration", () => {
  it("should be valid YAML (contains expected top-level keys)", () => {
    expect(lefthookContent).toContain("pre-commit:");
    expect(lefthookContent).toContain("commit-msg:");
  });

  it("should have docs-generate command in pre-commit", () => {
    expect(lefthookContent).toContain("docs-generate:");
  });

  it("docs-generate should run task docs:generate", () => {
    expect(lefthookContent).toMatch(/docs-generate:[\s\S]*?run:.*docs:generate/);
  });

  it("docs-generate should have stage_fixed enabled", () => {
    expect(lefthookContent).toMatch(/docs-generate:[\s\S]*?stage_fixed:\s*true/);
  });

  it("docs-generate should run before datamitsu-check and before test", () => {
    const checkPriority = lefthookContent.match(/datamitsu-check:[\s\S]*?priority:\s*(\d+)/);
    const docsPriority = lefthookContent.match(/docs-generate:[\s\S]*?priority:\s*(\d+)/);
    const testPriority = lefthookContent.match(/test:[\s\S]*?priority:\s*(\d+)/);

    expect(checkPriority).not.toBeNull();
    expect(docsPriority).not.toBeNull();
    expect(testPriority).not.toBeNull();

    const check = Number(checkPriority![1]);
    const docs = Number(docsPriority![1]);
    const test = Number(testPriority![1]);

    // Lower priority number runs first in lefthook
    // Expected order: docs (1) → check (2) → test (3)
    expect(docs).toBeLessThan(check);
    expect(docs).toBeLessThan(test);
    expect(check).toBeLessThan(test);
  });

  it("pre-commit should not run in parallel", () => {
    expect(lefthookContent).toMatch(/pre-commit:[\s\S]*?parallel:\s*false/);
  });
});
