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

  it("strips every setting pnpm 12 rejects", () => {
    const rejected = [
      "confirmModulesPurge",
      "ignoreDepScripts",
      "ignorePatchFailures",
      "managePackageManagerVersions",
      "packageManagerStrict",
      "packageManagerStrictVersion",
      "useNodeVersion",
    ];
    const result = render(
      stringify({
        ...Object.fromEntries(rejected.map((key) => [key, true])),
        packages: ["packages/*"],
      }),
    );

    for (const key of rejected) {
      expect(result).not.toHaveProperty(key);
    }
    expect(result.packages).toEqual(["packages/*"]);
  });

  it("carries allowNonAppliedPatches over to its pnpm 12 name", () => {
    const result = render("allowNonAppliedPatches: true\n");

    expect(result).not.toHaveProperty("allowNonAppliedPatches");
    expect(result.allowUnusedPatches).toBe(true);
  });

  it("keeps an allowUnusedPatches the file already has over the legacy value", () => {
    const result = render("allowNonAppliedPatches: true\nallowUnusedPatches: false\n");

    expect(result).not.toHaveProperty("allowNonAppliedPatches");
    expect(result.allowUnusedPatches).toBe(false);
  });

  it("keeps the project's audit settings and sets only the level", () => {
    const result = render(`
auditLevel: moderate
audit:
  level: low
  ignore:
    - GHSA-aaaa-bbbb-cccc
`);

    expect(result).not.toHaveProperty("auditLevel");
    expect(result.audit).toEqual({ ignore: ["GHSA-aaaa-bbbb-cccc"], level: "high" });
  });

  it.each(["", "audit:\n", "audit: {}\nauditLevel: high\n"])(
    "sets the audit level when the file has none: %j",
    (input) => {
      const result = render(input);

      expect(result).not.toHaveProperty("auditLevel");
      expect(result.audit).toEqual({ level: "high" });
    },
  );

  it.each([{ audit: "high" }, { audit: ["GHSA-aaaa-bbbb-cccc"] }])(
    "rejects a malformed audit section instead of losing it: %j",
    (input) => {
      expect(() => render(stringify(input))).toThrow("must be a mapping of pnpm audit settings");
    },
  );

  it("renders the same file again on a second reconciliation", () => {
    const first = render(`
allowNonAppliedPatches: true
confirmModulesPurge: false
auditLevel: moderate
audit:
  ignore:
    - GHSA-aaaa-bbbb-cccc
trustPolicy:
  allowDowngrade:
    - semver@6.3.1
`);

    expect(render(stringify(first))).toEqual(first);
  });
});
