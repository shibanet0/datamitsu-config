import type { PackageJson } from "type-fest";

import { beforeAll, describe, expect, it } from "vitest";

import { detectPackageType } from "../../utils/detectPackageType.js";

const SELF_DEP = "@shibanet0/datamitsu-config";

describe("detectPackageType", () => {
  it("defaults to module for empty or ESM-friendly dependencies", () => {
    expect(detectPackageType({})).toBe("module");
    expect(detectPackageType({ dependencies: { react: "19.0.0" } })).toBe("module");
  });

  it.each([
    ["dependencies", "next"],
    ["dependencies", "@docusaurus/core"],
    ["dependencies", "gatsby"],
    ["devDependencies", "electron"],
    ["peerDependencies", "react-native"],
    ["optionalDependencies", "expo"],
  ])("returns commonjs when %s contains %s", (bucket, dep) => {
    expect(detectPackageType({ [bucket]: { [dep]: "1.0.0" } })).toBe("commonjs");
  });
});

describe("packageJson content", () => {
  // package_json.ts imports cleanDependencies -> apps, which references the
  // goja-injected YAML / pnpmWorkspaceDefaults globals at module load. Stub
  // them and load the module dynamically so the import does not throw.
  let render: (data: PackageJson, isRoot?: boolean) => PackageJson;
  let renderRaw: (originalContent: string | undefined, isRoot?: boolean) => string;

  beforeAll(async () => {
    (globalThis as Record<string, unknown>).YAML = { stringify: () => "" };
    (globalThis as Record<string, unknown>).pnpmWorkspaceDefaults = {};

    const { packageJson } = await import("../package_json.js");
    const content = packageJson.content!;

    renderRaw = (originalContent, isRoot = true) =>
      content({ cwdPath: "/project", isRoot, originalContent } as never);
    render = (data, isRoot = true) =>
      JSON.parse(renderRaw(JSON.stringify(data), isRoot)) as PackageJson;
  });

  it("auto-detects type when unset", () => {
    expect(render({}).type).toBe("module");
    expect(render({ dependencies: { next: "15.0.0" } }).type).toBe("commonjs");
  });

  it("never overrides an explicit type", () => {
    expect(render({ type: "commonjs" }).type).toBe("commonjs");
    expect(render({ dependencies: { next: "15.0.0" }, type: "module" }).type).toBe("module");
  });

  it("strips prepare/postinstall/preinstall at the root", () => {
    const result = render({
      scripts: { build: "tsc", postinstall: "x", preinstall: "y", prepare: "z" },
    });
    expect(result.scripts).toEqual({ build: "tsc" });
  });

  it("leaves lifecycle scripts on non-root members but still drops fix/lint", () => {
    const result = render({ scripts: { build: "tsc", fix: "a", lint: "b", prepare: "z" } }, false);
    expect(result.scripts).toEqual({ build: "tsc", prepare: "z" });
  });

  it("drops the scripts key entirely when nothing survives", () => {
    expect(render({ scripts: { fix: "a", lint: "b", prepare: "z" } }).scripts).toBeUndefined();
  });

  it("pins the datamitsu-config self dependency through the pnpm catalog", () => {
    expect(render({}).devDependencies?.[SELF_DEP]).toBe("catalog:");
  });

  it("drops a config object that becomes empty after removing syncpack", () => {
    expect(render({ config: { syncpack: { foo: 1 } } } as PackageJson).config).toBeUndefined();
  });

  it("keeps other config keys while removing syncpack", () => {
    const result = render({ config: { bar: "baz", syncpack: { foo: 1 } } } as PackageJson);
    expect(result.config).toEqual({ bar: "baz" });
  });

  it("creates a fresh package from empty content", () => {
    const result = JSON.parse(renderRaw("")) as PackageJson;
    expect(result.type).toBe("module");
    expect(result.devDependencies?.[SELF_DEP]).toBe("catalog:");
  });

  it("aborts on malformed JSON instead of overwriting", () => {
    expect(() => renderRaw("{ not valid json")).toThrow(/not valid JSON/);
  });
});
