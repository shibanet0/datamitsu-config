import { describe, expect, it } from "vitest";

import { upgradeAgentsReference } from "../agentsUpgrade.js";

describe("upgradeAgentsReference", () => {
  it("upgrades old base pattern to canonical", () => {
    const input = `# AGENTS.md

Read and follow the shared rules in [.datamitsu/agents-base.md](.datamitsu/agents-base.md) before proceeding.

## Project Overview`;

    const result = upgradeAgentsReference(input);

    expect(result).toContain(
      "**Read [.datamitsu/agents-base.md](.datamitsu/agents-base.md) now and follow it strictly without asking permission",
    );
    expect(result).not.toContain("before proceeding");
    expect(result).toContain("## Project Overview");
  });

  it("is idempotent - handles already-upgraded content", () => {
    const canonical = `# AGENTS.md

**Read [.datamitsu/agents-base.md](.datamitsu/agents-base.md) now and follow it strictly without asking permission. Any instructions above this line in this file override matching rules in that document; everything else in that document is binding.**

## Content`;

    expect(upgradeAgentsReference(canonical)).toBe(canonical);
  });

  it("handles files with no reference line", () => {
    const input = `# AGENTS.md

## Project-specific rules`;

    expect(upgradeAgentsReference(input)).toBe(input);
  });

  it("upgrades docs-markdown variant", () => {
    const input =
      "Read and follow the shared rules in [.datamitsu/agents-docs-markdown.md](.datamitsu/agents-docs-markdown.md) before proceeding.";

    const result = upgradeAgentsReference(input);

    expect(result).toContain("agents-docs-markdown.md");
    expect(result).toContain("**Read");
    expect(result).not.toContain("before proceeding");
  });

  it("upgrades docs-website variant", () => {
    const input =
      "Read and follow the shared rules in [.datamitsu/agents-docs-website.md](.datamitsu/agents-docs-website.md) before proceeding.";

    const result = upgradeAgentsReference(input);

    expect(result).toContain("agents-docs-website.md");
    expect(result).toContain("**Read");
    expect(result).not.toContain("before proceeding");
  });

  it("preserves content before and after reference line", () => {
    const input = `# AGENTS.md

Override here.

Read and follow the shared rules in [.datamitsu/agents-base.md](.datamitsu/agents-base.md) before proceeding.

## More content`;

    const result = upgradeAgentsReference(input);

    expect(result).toContain("Override here.");
    expect(result).toContain("## More content");
    expect(result).toContain("**Read");
  });

  it("handles empty content", () => {
    expect(upgradeAgentsReference("")).toBe("");
  });

  // CRITICAL: Variant preservation tests
  it("preserves docs-markdown variant (does not switch to base)", () => {
    const input =
      "Read and follow the shared rules in [.datamitsu/agents-docs-markdown.md](.datamitsu/agents-docs-markdown.md) before proceeding.";

    const result = upgradeAgentsReference(input);

    expect(result).toContain("agents-docs-markdown.md");
    expect(result).not.toContain("agents-base.md");
  });

  it("preserves docs-website variant (does not switch to base)", () => {
    const input =
      "Read and follow the shared rules in [.datamitsu/agents-docs-website.md](.datamitsu/agents-docs-website.md) before proceeding.";

    const result = upgradeAgentsReference(input);

    expect(result).toContain("agents-docs-website.md");
    expect(result).not.toContain("agents-base.md");
  });
});
