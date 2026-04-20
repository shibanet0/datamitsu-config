import { describe, expect, it } from "vitest";

import { projectTypes } from "../project.js";

describe("projectTypes", () => {
  it("should have a description and non-empty markers array for each project type", () => {
    for (const [key, project] of Object.entries(projectTypes)) {
      expect(project).toHaveProperty("description");
      expect(typeof project.description).toBe("string");
      expect(Array.isArray(project.markers)).toBe(true);
      expect(project.markers.length, `${key} should have at least one marker`).toBeGreaterThan(0);
    }
  });

  it("should contain expected project type keys", () => {
    const expectedKeys = [
      "golang-package",
      "npm-package",
      "pnpm-package",
      "terraform-project",
      "turbo-package",
      "typescript-project",
      "typst-project",
    ];
    for (const key of expectedKeys) {
      expect(projectTypes).toHaveProperty(key);
    }
  });
});
