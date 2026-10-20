import { AGENTS_MD, upgradeAgentsReference } from "../agents-upgrade";
import { REMOVED_SKILLS, SKILLS } from "../skills";
import { withTrailingNewline } from "../utils";

export const aiTools: config.MapOfManagedConfigs = {
  ".cursor/rules": {
    linkTarget: "../AGENTS.md",
    scope: "git-root",
  },
  ".cursorrules": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },
  ".github/copilot-instructions.md": {
    linkTarget: "../AGENTS.md",
    scope: "git-root",
  },
  ".windsurfrules": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },
  "AGENTS.md": {
    content: (context) => {
      // Prefer existingContent (reflects prior layer merge transformations),
      // fall back to originalContent (raw file from disk)
      const existing = context.existingContent ?? context.originalContent;
      if (existing) {
        return withTrailingNewline(upgradeAgentsReference(existing));
      }

      // Fallback for new files (no existing content)
      return withTrailingNewline(AGENTS_MD);
    },
    scope: "git-root",
  },
  "CLAUDE.md": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },
  "GEMINI.md": {
    linkTarget: "AGENTS.md",
    scope: "git-root",
  },

  ...Object.fromEntries(
    SKILLS.map((s) => [
      `.claude/skills/${s.name}/SKILL.md`,
      {
        content: () => withTrailingNewline(s.adapters.claude),
        scope: "git-root" as const,
      },
    ]),
  ),

  ...Object.fromEntries(
    SKILLS.map((s) => [
      `.agents/skills/${s.name}/SKILL.md`,
      {
        content: () => withTrailingNewline(s.adapters.codex),
        otherFileNameList: [`.codex/prompts/${s.name}.md`],
        scope: "git-root" as const,
      },
    ]),
  ),

  ...(REMOVED_SKILLS.length > 0
    ? {
        "removed-skills-cleanup": {
          deleteOnly: true,
          otherFileNameList: REMOVED_SKILLS.flatMap((name) => [
            `.claude/skills/${name}/SKILL.md`,
            `.agents/skills/${name}/SKILL.md`,
            `.codex/prompts/${name}.md`,
          ]),
          scope: "git-root" as const,
        },
      }
    : {}),
};
