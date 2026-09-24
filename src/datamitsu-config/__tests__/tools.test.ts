import { describe, expect, it } from "vitest";

import { toolsConfig } from "../tools.js";

describe("tools", () => {
  describe("Go formatting", () => {
    /**
     * A formatter that declares no files is left out of editor format-on-save, and a bare
     * `golangci-lint fmt` walks the whole module. Both halves take the files instead, and at file
     * granularity one changed file re-runs alone.
     */
    it("hands golangci-lint fmt the Go files, one path each", () => {
      for (const operation of ["fix", "lint"] as const) {
        const op = toolsConfig["golangci-lint-fmt"]!.operations[operation]!;
        expect(op.args, operation).toContain("{files}");
        expect(op.globs, operation).toEqual(["**/*.go"]);
        expect(op.granularity, operation).toBe("file");
      }
    });

    it("keeps out what its own walk skips", () => {
      for (const operation of ["fix", "lint"] as const) {
        expect(
          toolsConfig["golangci-lint-fmt"]!.operations[operation]!.excludeGlobs,
          operation,
        ).toEqual(expect.arrayContaining(["**/testdata/**", "**/vendor/**"]));
      }
    });
  });

  describe("YAML formatting", () => {
    const isYaml = (glob: string) => /\.ya?ml$|\.y\*ml$/u.test(glob);

    it("has one owner: yamlfmt formats YAML and oxfmt does not", () => {
      for (const operation of ["fix", "lint"] as const) {
        const oxfmtGlobs = toolsConfig.oxfmt!.operations[operation]!.globs ?? [];
        expect(oxfmtGlobs.filter(isYaml), `oxfmt ${operation}`).toEqual([]);
      }
      expect(toolsConfig.yamlfmt!.operations.fix!.globs).toEqual(["**/*.yaml", "**/*.yml"]);
    });
  });

  describe("prettierGlobs", () => {
    const prettierGlobs = toolsConfig.prettier!.operations.lint!.globs;
    const eslintGlobs = toolsConfig.eslint!.operations.lint!.globs;

    it("should contain every eslint glob prettier has a parser for", () => {
      for (const pattern of eslintGlobs || []) {
        if (pattern === "**/*.svelte") {
          continue;
        }
        expect(prettierGlobs).toContain(pattern);
      }
    });

    /**
     * The one extension where the two lists diverge, and the reason they are no longer derived from
     * each other: ESLint reads `.svelte` through `svelte-eslint-parser`, while prettier has no
     * parser for it at all — `prettier --check a.svelte` fails with "No parser could be inferred"
     * rather than skipping the file. oxfmt owns svelte formatting instead, for every project — it
     * ships the compiler itself; see src/apps/oxfmt/index.ts.
     */
    it("does not claim svelte, which eslint does", () => {
      expect(eslintGlobs).toContain("**/*.svelte");
      expect(prettierGlobs).not.toContain("**/*.svelte");
      expect(toolsConfig.oxfmt!.operations.fix!.globs).toContain("**/*.svelte");
    });

    it("should contain the d.ts pattern", () => {
      expect(prettierGlobs).toContain("**/*.d.ts");
    });

    /**
     * Markdown has one formatter, and it is oxfmt. Both of them reach the fenced code inside a
     * document and write it identically — measured over js, ts, tsx, json, css, yaml and graphql —
     * so prettier was a second writer that added nothing, on file types oxfmt already covers in
     * every project type rather than only in npm ones.
     */
    it("leaves markdown to oxfmt", () => {
      expect(prettierGlobs).not.toContain("**/*.md");
      expect(toolsConfig.oxfmt!.operations.fix!.globs).toContain("**/*.md");
    });

    it("should not contain duplicate patterns", () => {
      const unique = [...new Set(prettierGlobs)];
      expect(prettierGlobs).toHaveLength(unique.length);
    });
  });

  describe("oxfmt scope", () => {
    /**
     * Per project rather than per repository, but reading the one config at the git root.
     *
     * `{cwd}/oxfmt.config.ts` was tried and reverted: oxfmt carries no `projectTypes`, so a
     * project-scoped managed config lands in every detected project — measured on a bare fixture,
     * `oxfmt.config.ts` in `.github/workflows/` and `docker/` as well as the root. Nothing about
     * svelte depends on this any more: that option is on for every project.
     */
    it("runs per project and reads the root config", () => {
      for (const operation of ["fix", "lint"] as const) {
        const op = toolsConfig.oxfmt!.operations[operation]!;
        expect(op.scope, operation).toBe("per-project");
        // Resolves to the git root because the managed config is git-root scoped.
        expect(op.args, operation).toContain("{managedConfig:oxfmt.config.ts}");
        expect(op.args, operation).not.toContain("{cwd}/oxfmt.config.ts");
      }
    });

    /**
     * Given no positional paths, oxfmt formats the current directory recursively — so a path-less
     * root run in a monorepo would walk into every package carrying the root's settings. The
     * planner never produces one (a selection that matches nothing schedules no run), but the token
     * is what makes that true, so losing it is the failure this pins.
     */
    it("always passes an explicit file list", () => {
      for (const operation of ["fix", "lint"] as const) {
        expect(toolsConfig.oxfmt!.operations[operation]!.args, operation).toContain("{files}");
      }
    });
  });

  describe("stylelintGlobs", () => {
    const globs = toolsConfig.stylelint!.operations.lint!.globs ?? [];

    /**
     * Stylelint 17 bundles no syntax but its own CSS parser. `.scss` parses because
     * `stylelint-config-standard-scss` brings `postcss-scss`; `.less` would need `postcss-less` and
     * a preset neither of which is adopted, and stylelint fails to parse the file rather than
     * skipping it — so the gap is stated rather than hidden behind a glob that cannot work.
     */
    it("covers scss but not less", () => {
      expect(globs).toContain("**/*.scss");
      expect(globs).not.toContain("**/*.less");
    });

    it("covers the shapes that carry a <style> block", () => {
      for (const pattern of ["**/*.html", "**/*.vue", "**/*.svelte"]) {
        expect(globs).toContain(pattern);
      }
    });

    it("runs its fix before the formatters get the last word", () => {
      const stylelint = toolsConfig.stylelint!.operations.fix!.priority!;
      for (const formatter of ["prettier", "oxfmt"] as const) {
        expect(stylelint).toBeLessThan(toolsConfig[formatter]!.operations.fix!.priority!);
      }
    });
  });

  describe("toolsConfig", () => {
    it("should define all expected tools", () => {
      const expectedTools = [
        "actionlint",
        "bearer",
        "checkmake",
        "cspell",
        "dotenv-linter",
        "editorconfig-checker",
        "eslint",
        "golangci-lint",
        "grype",
        "hadolint",
        "helm",
        "lychee",
        "osv-scanner",
        "oxlint",
        "protolint",
        "pre-commit",
        "prettier",
        "shellcheck",
        "shfmt",
        "sort-package-json",
        "stylelint",
        "syncpack",
        "trivy",
        "tsc",
        "typos",
        "typstyle",
        "yamlfmt",
        "yamllint",
        "yq-json",
      ];
      for (const tool of expectedTools) {
        expect(toolsConfig).toHaveProperty(tool);
      }
    });

    /**
     * Key sorting for YAML and `.properties` moved off `yq`, which lost data doing it: sorting a
     * YAML mapping moved an alias above its anchor, and the `.properties` round-trip through YAML
     * folded `a.b` into `a`, dropping whichever key sorted second. Both were reproduced against the
     * pinned binary; `sort-keys` replaces them and is covered in src/apps/sort-keys.
     */
    it("sorts yaml and properties keys with sort-keys, not yq", () => {
      expect(toolsConfig).not.toHaveProperty("yq-yaml");
      expect(toolsConfig).not.toHaveProperty("yq-properties");
      expect(toolsConfig["sort-keys-yaml"]!.operations.fix!.app).toBe("sort-keys");
      expect(toolsConfig["sort-keys-properties"]!.operations.fix!.app).toBe("sort-keys");
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
