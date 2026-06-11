import { describe, expect, it } from "vitest";

import { toolsConfig } from "../tools.js";

describe("tools", () => {
  describe("prettierGlobs", () => {
    const prettierGlobs = toolsConfig.prettier!.operations.lint!.globs;
    const eslintGlobs = toolsConfig.eslint!.operations.lint!.globs;

    it("should contain all eslint glob patterns", () => {
      for (const pattern of eslintGlobs || []) {
        expect(prettierGlobs).toContain(pattern);
      }
    });

    it("should contain d.ts and md patterns", () => {
      expect(prettierGlobs).toContain("**/*.d.ts");
      expect(prettierGlobs).toContain("**/*.md");
    });

    it("should not contain duplicate patterns", () => {
      const unique = [...new Set(prettierGlobs)];
      expect(prettierGlobs).toHaveLength(unique.length);
    });
  });

  describe("toolsConfig", () => {
    it("should define all expected tools", () => {
      const expectedTools = [
        "checkmake",
        "cspell",
        "dotenv-linter",
        "editorconfig-checker",
        "eslint",
        "golangci-lint",
        "hadolint",
        "helm",
        "oxlint",
        "pre-commit",
        "prettier",
        "shellcheck",
        "shfmt",
        "sort-package-json",
        "syncpack",
        "tsc",
        "typstyle",
        "yamlfmt",
        "yamllint",
        "yq-json",
        "yq-properties",
        "yq-yaml",
      ];
      for (const tool of expectedTools) {
        expect(toolsConfig).toHaveProperty(tool);
      }
    });

    it("should have at least one operation for every tool", () => {
      for (const [toolName, tool] of Object.entries(toolsConfig)) {
        const operations = Object.keys(tool.operations);
        expect(
          operations.length,
          `Tool ${toolName} should have at least one operation (lint or fix)`,
        ).toBeGreaterThan(0);
      }
    });
  });
});
