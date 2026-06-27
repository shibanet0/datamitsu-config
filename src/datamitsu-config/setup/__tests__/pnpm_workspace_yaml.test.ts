import { beforeAll, describe, expect, it } from "vitest";

import { name as selfName, version as selfVersion } from "../../../../package.json";
import { pnpmWorkspaceYaml } from "../pnpm_workspace_yaml.js";

// The goja YAML global isn't available under vitest. Stub it with a JSON
// round-trip so we can exercise the merge/sort logic and read the result back.
const render = (originalContent: string): Record<string, any> =>
  JSON.parse(
    pnpmWorkspaceYaml.content!({
      datamitsuDir: ".datamitsu",
      originalContent,
    } as never)!,
  ) as Record<string, any>;

describe("pnpmWorkspaceYaml catalog", () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>).YAML = {
      parse: (text: string) => (text ? JSON.parse(text) : {}),
      stringify: (value: unknown) => JSON.stringify(value),
    };
    (globalThis as Record<string, unknown>).pnpmWorkspaceDefaults = {};
  });

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
});
