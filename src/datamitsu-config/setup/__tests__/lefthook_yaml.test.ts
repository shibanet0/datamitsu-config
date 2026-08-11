import { beforeAll, describe, expect, it } from "vitest";

import { lefthookYaml } from "../lefthook_yaml.js";

// The goja YAML/facts globals aren't available under vitest. Stub YAML with a
// JSON round-trip and facts with fixed identities so we can exercise the merge
// and read the rendered config back.
const render = (originalContent?: string): Record<string, any> => {
  const out = lefthookYaml.content!({ originalContent } as never);
  return JSON.parse(out as string) as Record<string, any>;
};

const preCommitCommands = (originalContent?: string): Record<string, any> =>
  render(originalContent)["pre-commit"].commands as Record<string, any>;

describe("lefthookYaml", () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>).YAML = {
      parse: (text: string) => (text ? JSON.parse(text) : undefined),
      stringify: (value: unknown) => JSON.stringify(value),
    };
    (globalThis as Record<string, unknown>).facts = () => ({
      binaryCommand: "node bin/datamitsu.js",
      env: {},
      packageName: "datamitsu",
    });
  });

  it("sorts and validates the lefthook config via tools, not bespoke hook jobs", () => {
    // `lefthook-sort` (fix) and `lefthook-validate` (lint) live in toolsConfig,
    // so they run inside `datamitsu check` instead of as their own commands.
    const commands = preCommitCommands();
    expect(commands["sort-lefthook"]).toBeUndefined();
    expect(commands["lefthook-validate"]).toBeUndefined();
    expect(commands["datamitsu-check"].run).toBe("node bin/datamitsu.js check --file-scoped");
  });

  it("orders the fix band so init runs before check", () => {
    const commands = preCommitCommands();
    const initP = commands["datamitsu-init"].priority as number;
    const checkP = commands["datamitsu-check"].priority as number;

    expect(initP).toBeLessThan(checkP);
    // both sit in the fix band (10–90)
    expect(initP).toBeGreaterThanOrEqual(10);
    expect(checkP).toBeLessThanOrEqual(90);
  });

  it("keeps hooks sequential so priority is honoured", () => {
    // lefthook ignores `priority` when `parallel: true`; these hooks must stay
    // sequential for the band ordering to mean anything.
    const config = render();
    expect(config["pre-commit"].parallel).toBe(false);
    expect(config["post-checkout"].parallel).toBe(false);
  });

  it("preserves pre-existing pre-commit commands when merging", () => {
    const existing = JSON.stringify({
      "pre-commit": { commands: { "my-custom": { priority: 5, run: "echo hi" } } },
    });
    const commands = preCommitCommands(existing);
    expect(commands["my-custom"]).toEqual({ priority: 5, run: "echo hi" });
    // and the managed jobs are still present alongside it
    expect(commands["datamitsu-check"]).toBeDefined();
    expect(commands["datamitsu-init"]).toBeDefined();
  });
});
