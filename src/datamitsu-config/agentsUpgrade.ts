interface ReferencePattern {
  canonical: string;
  oldPatterns: string[];
}

/**
 * Mapping of agent file variants to their reference line patterns. oldPatterns is append-only - add
 * new historical versions here as the format evolves.
 */
const AGENTS_REFERENCE_PATTERNS: Record<string, ReferencePattern> = {
  "agents-base.md": {
    canonical:
      "**Read [.datamitsu/ai/agents/agents-base.md](.datamitsu/ai/agents/agents-base.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**",
    oldPatterns: [
      // v1 format (original)
      "Read and follow the shared rules in [.datamitsu/agents-base.md](.datamitsu/agents-base.md) before proceeding.",
      // v2 format (pre-ai/ restructure)
      "**Read [.datamitsu/agents-base.md](.datamitsu/agents-base.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**",
    ],
  },
  "agents-docs-markdown.md": {
    canonical:
      "**Read [.datamitsu/ai/agents/agents-docs-markdown.md](.datamitsu/ai/agents/agents-docs-markdown.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**",
    oldPatterns: [
      // v1 format (original)
      "Read and follow the shared rules in [.datamitsu/agents-docs-markdown.md](.datamitsu/agents-docs-markdown.md) before proceeding.",
      // v2 format (pre-ai/ restructure)
      "**Read [.datamitsu/agents-docs-markdown.md](.datamitsu/agents-docs-markdown.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**",
    ],
  },
  "agents-docs-website.md": {
    canonical:
      "**Read [.datamitsu/ai/agents/agents-docs-website.md](.datamitsu/ai/agents/agents-docs-website.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**",
    oldPatterns: [
      // v1 format (original)
      "Read and follow the shared rules in [.datamitsu/agents-docs-website.md](.datamitsu/agents-docs-website.md) before proceeding.",
      // v2 format (pre-ai/ restructure)
      "**Read [.datamitsu/agents-docs-website.md](.datamitsu/agents-docs-website.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**",
    ],
  },
};

/**
 * Auto-upgrades AGENTS.md reference lines from old formats to canonical format.
 *
 * Searches through content line-by-line for old reference patterns and replaces them with the
 * current canonical version. Supports all three file variants (agents-base.md,
 * agents-docs-markdown.md, agents-docs-website.md).
 *
 * Operation is idempotent - safe to run on already-upgraded content.
 *
 * @param content - The AGENTS.md file content
 * @returns Updated content with upgraded reference line, or unchanged if no match found
 */
export function upgradeAgentsReference(content: string): string {
  const lines = content.split("\n");

  for (const pattern of Object.values(AGENTS_REFERENCE_PATTERNS)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line) {
        const trimmed = line.trim();

        // Check if this line matches any old pattern
        if (pattern.oldPatterns.some((oldPattern) => trimmed === oldPattern)) {
          lines[i] = pattern.canonical;
          return lines.join("\n");
        }

        // If line already matches canonical, no upgrade needed
        if (trimmed === pattern.canonical) {
          return content;
        }
      }
    }
  }

  return content;
}

/**
 * Default AGENTS.md template for new projects.
 */
export const AGENTS_MD = `# AGENTS.md

${AGENTS_REFERENCE_PATTERNS["agents-base.md"]?.canonical}
`;
