import { describe, expect, it, vi } from "vitest";

const experimentalToolNames = [
  "alint",
  "blint",
  "cargo-deny",
  "deptry",
  "govulncheck",
  "kubeconform",
  "ls-lint",
  "mdsf",
  "zizmor",
] as const;

const loadToolsWithExperimentalEnv = async (value?: string) => {
  const runtime = globalThis as typeof globalThis & { facts: () => Facts };
  const originalFacts = runtime.facts;
  runtime.facts = () => {
    const current = originalFacts();
    return {
      ...current,
      env: {
        ...current.env,
        ...(value === undefined ? {} : { DATAMITSU_EXPERIMENTAL_TOOLS: value }),
      },
    };
  };
  // Reload the config module so each case evaluates facts().env independently.
  vi.resetModules();
  try {
    return await import("../tools.js");
  } finally {
    runtime.facts = originalFacts;
  }
};

describe("experimental tools", () => {
  it("keeps the unfinished opt-in tools disabled without the environment variable", async () => {
    const { toolsConfig } = await loadToolsWithExperimentalEnv();

    const pendingTools = Object.entries(toolsConfig)
      .filter(([, tool]) => tool.skipReason === "opt-in: pending manual review & config tuning")
      .map(([name]) => name)
      .sort();
    expect(pendingTools).toEqual([...experimentalToolNames].sort());

    for (const tool of experimentalToolNames) {
      expect(toolsConfig[tool]!.skip, tool).toBe(true);
    }
  });

  it("enables only explicitly named tools and ignores unknown names", async () => {
    const { toolsConfig } = await loadToolsWithExperimentalEnv(" alint,unknown-tool ");

    expect(toolsConfig.alint!.skip).toBe(false);
    expect(toolsConfig.blint!.skip).toBe(true);
    expect(toolsConfig.prettier!.skip).toBe(true);
  });

  it("accepts multiple experimental tools with comma-separated names", async () => {
    const { toolsConfig } = await loadToolsWithExperimentalEnv("mdsf,zizmor");

    expect(toolsConfig.mdsf!.skip).toBe(false);
    expect(toolsConfig.zizmor!.skip).toBe(false);
    expect(toolsConfig.govulncheck!.skip).toBe(true);
  });
});
