import { afterEach, describe, expect, it, vi } from "vitest";

const hostFacts = facts();

const appsFor = async (platform: Pick<Facts, "arch" | "os">) => {
  vi.resetModules();
  vi.stubGlobal("facts", () => ({ ...hostFacts, ...platform }));
  vi.stubGlobal("YAML", { stringify: () => "" });
  vi.stubGlobal("pnpmWorkspaceDefaults", {});
  // App availability reads facts at module load, so each platform needs a fresh import.
  return (await import("../apps.js")).mapOfApps;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("managed app platform availability", () => {
  it("excludes only Semgrep on Intel macOS", async () => {
    const supported = await appsFor({ arch: "arm64", os: "darwin" });
    const intelMac = await appsFor({ arch: "amd64", os: "darwin" });

    expect("semgrep" in supported).toBe(true);
    expect(Object.keys(intelMac).sort()).toEqual(
      Object.keys(supported)
        .filter((name) => name !== "semgrep")
        .sort(),
    );
  });

  it("retains Semgrep on other amd64 hosts", async () => {
    for (const os of ["linux", "windows"] as const) {
      expect("semgrep" in (await appsFor({ arch: "amd64", os }))).toBe(true);
    }
  });
});
