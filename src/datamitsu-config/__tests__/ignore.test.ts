import { describe, expect, it } from "vitest";

import { ignoreGroups } from "../ignore.js";

describe("ignoreGroups", () => {
  const expectedCategories = [
    "Build outputs",
    "Cache & temporary files",
    "Claude Code project files",
    "Codex CLI project files",
    "Dependencies",
    "Environment",
    "Golang specific",
    "IDE & OS",
    "Logs",
    "Other",
    "Pulumi",
    "ralphex progress logs",
    "Security & Secrets",
    "Testing",
  ];

  it("should contain all expected categories", () => {
    for (const category of expectedCategories) {
      expect(ignoreGroups).toHaveProperty(category);
    }
  });

  it("should have a non-empty array of strings for each category", () => {
    for (const [key, patterns] of Object.entries(ignoreGroups)) {
      expect(Array.isArray(patterns), `${key} should be an array`).toBe(true);
      expect(patterns.length, `${key} should not be empty`).toBeGreaterThan(0);
      for (const pattern of patterns) {
        expect(typeof pattern, `patterns in ${key} should be strings`).toBe("string");
      }
    }
  });

  it("should include node_modules pattern in Dependencies", () => {
    expect(ignoreGroups.Dependencies).toContain("**/node_modules/");
  });
});
