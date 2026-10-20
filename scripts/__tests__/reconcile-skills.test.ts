import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { fixtureEnvironment } from "../../src/apps/test-support/env.js";
import { SKILLS } from "../../src/datamitsu-config/skills.js";

const ROOT = join(import.meta.dirname, "../..");
const CORE_CLI = join(
  dirname(fileURLToPath(import.meta.resolve("@datamitsu/datamitsu/package.json"))),
  "bin/index.js",
);
const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { force: true, recursive: true });
  }
});

describe("skill reconciliation", () => {
  it("migrates managed Codex prompts into discoverable skills without deleting user prompts", () => {
    const cwd = mkdtempSync(join(tmpdir(), "datamitsu-skills-"));
    fixtures.push(cwd);
    const env = fixtureEnvironment();
    execFileSync("git", ["init", "--quiet", cwd], { env });
    writeFileSync(
      join(cwd, "datamitsu.config.js"),
      `function getMinVersion() { return "0.5.1"; }
function getConfig(input) {
  return {
    ...input,
    initCommands: [],
    managedConfigs: Object.fromEntries(
      Object.entries(input.managedConfigs).filter(([name]) =>
        name.startsWith(".agents/skills/") ||
        name.startsWith(".claude/skills/") ||
        name.startsWith(".codex/prompts/") ||
        name === "removed-skills-cleanup"
      )
    ),
    tools: {},
  };
}
`,
    );
    const prompts = join(cwd, ".codex/prompts");
    mkdirSync(prompts, { recursive: true });
    for (const skill of SKILLS) {
      writeFileSync(join(prompts, `${skill.name}.md`), `# /${skill.name}\n`);
    }
    const customPrompt = "# Project-specific prompt\n";
    writeFileSync(join(prompts, "custom.md"), customPrompt);

    const args = [
      CORE_CLI,
      "--before-config",
      join(ROOT, "datamitsu.config.base.js"),
      "config",
      "reconcile",
      "--skip-fix",
    ];
    execFileSync(process.execPath, args, { cwd, env, stdio: "pipe" });

    for (const skill of SKILLS) {
      const skillPath = join(cwd, ".agents/skills", skill.name, "SKILL.md");
      const content = readFileSync(skillPath, "utf8");
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(content);
      expect(frontmatter, skillPath).not.toBeNull();
      const metadata = parse(frontmatter![1]!);
      expect(metadata.name).toBe(skill.name);
      expect(metadata.description).toEqual(expect.any(String));
      expect(metadata.description.trim().length).toBeGreaterThan(0);
      expect(metadata.description.length).toBeLessThanOrEqual(1024);
      expect(existsSync(join(prompts, `${skill.name}.md`))).toBe(false);
      expect(existsSync(join(cwd, ".claude/skills", skill.name, "SKILL.md"))).toBe(true);
    }
    expect(readFileSync(join(prompts, "custom.md"), "utf8")).toBe(customPrompt);

    const first = SKILLS.map((skill) =>
      readFileSync(join(cwd, ".agents/skills", skill.name, "SKILL.md"), "utf8"),
    );
    execFileSync(process.execPath, args, { cwd, env, stdio: "pipe" });
    expect(
      SKILLS.map((skill) =>
        readFileSync(join(cwd, ".agents/skills", skill.name, "SKILL.md"), "utf8"),
      ),
    ).toEqual(first);
    expect(readFileSync(join(prompts, "custom.md"), "utf8")).toBe(customPrompt);
  });
});
