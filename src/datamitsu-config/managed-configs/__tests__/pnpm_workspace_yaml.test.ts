import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import { name as selfName, version as selfVersion } from "../../../../package.json";
import { pnpmWorkspaceYaml } from "../pnpm_workspace_yaml.js";

const render = (originalContent: string): Record<string, any> =>
  parse(
    pnpmWorkspaceYaml.content!({
      datamitsuDir: ".datamitsu",
      originalContent,
    } as never)!,
  ) as Record<string, any>;

describe("pnpmWorkspaceYaml", () => {
  beforeEach(() => {
    vi.stubGlobal("YAML", { parse, stringify });
    vi.stubGlobal("pnpmWorkspaceDefaults", { trustPolicy: "no-downgrade" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("defines the config package in the catalog at its own version", () => {
    expect(render("{}").catalog[selfName]).toBe(selfVersion);
  });

  it("preserves existing catalog entries and sorts keys", () => {
    const result = render(JSON.stringify({ catalog: { zod: "3.0.0" } }));

    expect(result.catalog.zod).toBe("3.0.0");
    expect(result.catalog[selfName]).toBe(selfVersion);

    const keys = Object.keys(result.catalog);
    expect(keys).toEqual([...keys].sort());
  });

  it("migrates nested downgrade exceptions and keeps package selectors intact", () => {
    const result = render(`
trustPolicy:
  allowDowngrade:
    - semver@6.3.1
    - '@scope/tool@1.0.0 || 2.0.0'
packages:
  - packages/*
`);

    expect(result.trustPolicy).toBe("no-downgrade");
    expect(result.trustPolicyExclude).toEqual(["semver@6.3.1", "@scope/tool@1.0.0 || 2.0.0"]);
    expect(result.packages).toEqual(["packages/*"]);
    expect(render(stringify(result))).toEqual(result);
  });

  it("merges legacy and current exceptions without duplicates", () => {
    const result = render(`
trustPolicyExclude:
  - example-tool@1.0.0
  - semver@6.3.1
trustPolicy:
  allowDowngrade:
    - semver@6.3.1
    - example-library@2.0.0
    - example-library@2.0.0
`);

    expect(result.trustPolicyExclude).toEqual([
      "example-tool@1.0.0",
      "semver@6.3.1",
      "example-library@2.0.0",
    ]);
  });

  it("preserves default exceptions when migrating an empty legacy list", () => {
    vi.stubGlobal("pnpmWorkspaceDefaults", {
      trustPolicy: "no-downgrade",
      trustPolicyExclude: ["example-tool@1.0.0"],
    });

    const result = render("trustPolicy:\n  allowDowngrade: []\n");
    expect(result.trustPolicy).toBe("no-downgrade");
    expect(result.trustPolicyExclude).toEqual(["example-tool@1.0.0"]);
  });

  it.each(["off", "no-downgrade"])("preserves a modern %s policy", (trustPolicy) => {
    const result = render(stringify({ trustPolicy, trustPolicyExclude: ["semver@6.3.1"] }));
    expect(result.trustPolicy).toBe(trustPolicy);
    expect(result.trustPolicyExclude).toEqual(["semver@6.3.1"]);
  });

  it.each([
    { trustPolicy: { allowDowngrade: "semver@6.3.1" } },
    { trustPolicy: { allowDowngrade: [false] } },
    { trustPolicy: { allowDowngrade: [] }, trustPolicyExclude: "semver@6.3.1" },
  ])("rejects malformed exclusions instead of losing them: %j", (input) => {
    expect(() => render(stringify(input))).toThrow("must be lists of package selectors");
  });
});
