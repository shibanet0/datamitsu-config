import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WORKFLOW_DIR = join(import.meta.dirname, "../../.github/workflows");

const files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

describe("workflow CI guards", () => {
  for (const file of files) {
    const content = readFileSync(join(WORKFLOW_DIR, file), "utf8");

    // Regression guard: `pnpm exec datamitsu` resolves the global binary and
    // skips `--before-config`, which silently changes the resolved config (and
    // thus the configHash used to seed the store), breaking offline `exec`.
    // The wrappers `pnpm dm` and `node bin/datamitsu.js` always pass it.
    it(`${file}: no bare 'pnpm exec datamitsu'`, () => {
      const matches = [...content.matchAll(/pnpm exec datamitsu\b/g)];
      expect(
        matches,
        `Found ${matches.length} bare 'pnpm exec datamitsu' in ${file}. ` +
          `Use 'pnpm dm' or 'node bin/datamitsu.js' so --before-config is always passed.`,
      ).toHaveLength(0);
    });
  }

  it("found at least one workflow to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });
});
