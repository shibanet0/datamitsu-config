import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { mapOfApps as configuredApps } from "../apps.js";

import {
  apps as binaryAppsJSON,
  binaries as binaryBinariesJSON,
} from "../registries/binaryApps.json";
import catalog from "../registries/schepherdCatalog.json";

const toml = createRequire(import.meta.resolve("knip"))("smol-toml") as {
  parse: (input: string) => Record<string, unknown>;
};
type MapOfApps = typeof configuredApps;
let mapOfApps: MapOfApps;

beforeAll(async () => {
  vi.stubGlobal("YAML", { stringify: () => "" });
  vi.stubGlobal("TOML", toml);
  vi.stubGlobal("pnpmWorkspaceDefaults", {});
  // apps.ts evaluates Goja TOML/YAML globals at import time, so stub them before loading it.
  ({ mapOfApps } = await import("../apps.js"));
});

afterAll(() => vi.unstubAllGlobals());

describe("Schepherd managed app", () => {
  it("prepares and runs the same catalog with exact processor bindings", () => {
    const app = mapOfApps.schepherd!;
    const prepare = app.prepare!;
    const args = prepare.args!;
    const option = (flag: string) => {
      const index = args.indexOf(flag);
      expect(index, `preparation requires ${flag}`).toBeGreaterThanOrEqual(0);
      return args[index + 1]!;
    };

    expect(prepare.network).toBe(true);
    expect(args).toContain("materialize");
    expect(args).toContain("--compile-persistable");
    expect(args).not.toContain("--compile");
    expect(args).toContain("--json");
    expect(option("--repository")).toBe(catalog.repository);
    expect(option("--catalog")).toBe(catalog.digest);
    expect(option("--cache-dir")).toBe("${APP_PREPARED}");
    expect(app.runtimeEnv?.SCHEPHERD_CACHE_DIR).toBe(option("--cache-dir"));

    const configPath = option("--config");
    expect(configPath).toMatch(/^\$\{APP_DIR\}\//u);
    const recipe = toml.parse(app.files![configPath.slice("${APP_DIR}/".length)]!) as {
      processors: Record<
        string,
        { command: string; convert?: string; env?: Record<string, string>; type: string }
      >;
      runner: { processors: string[] };
    };
    const dependencies = new Map(
      app.dependsOn!.map((dependency) =>
        typeof dependency === "string"
          ? [dependency, dependency]
          : [dependency.as ?? dependency.app, dependency.app],
      ),
    );
    const binding = (template: string) => {
      const variable = /^\$\{([A-Z_]+)\}$/u.exec(template)?.[1];
      expect(variable, "recipe command must use a managed environment binding").toBeDefined();
      const value = prepare.env![variable!]!;
      expect(
        app.runtimeEnv?.[variable!],
        "prepare and runtime must resolve the same executable",
      ).toBe(value);
      const alias = /^\$\{APP_BIN:([^}]+)\}$/u.exec(value)?.[1];
      expect(alias, "executable must bind an exact direct dependency").toBeDefined();
      return dependencies.get(alias!);
    };

    expect(recipe.runner.processors.map((name) => recipe.processors[name]!.type)).toEqual([
      "sourcemeta",
      "check-jsonschema",
      "ajv",
    ]);
    const expectedApps: Record<string, string> = {
      ajv: "schepherd-ajv",
      "check-jsonschema": "schepherd-check-jsonschema",
      sourcemeta: "jsonschema",
    };
    for (const name of recipe.runner.processors) {
      const processor = recipe.processors[name]!;
      expect(binding(processor.command)).toBe(expectedApps[processor.type]);
      if (processor.type === "sourcemeta") {
        expect(binding(processor.convert!)).toBe("yq");
      }
      if (processor.type === "check-jsonschema") {
        expect(binding(processor.env!.CHECK_JSONSCHEMA_BIN!)).toBe("check-jsonschema");
      }
    }
    expect(binding("${SCHEPHERD_BIN}")).toBe("dm-internal-schepherd-upstream");
  });

  it("preserves exact native assets on the processor-supported target intersection", () => {
    const app = mapOfApps["dm-internal-schepherd-upstream"]!;
    const targets = binaryBinariesJSON.schepherd.binaries as unknown as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;
    const validatorTargets = binaryBinariesJSON.jsonschema.binaries as unknown as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;
    const installedTargets = app.binary!.binaries as unknown as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;

    expect(app.prepare).toBeUndefined();
    expect(app.links).toBeUndefined();
    expect(app.binary?.version).toBe(binaryAppsJSON.schepherd.tag);
    expect(app.versionCheck).toEqual({ args: ["version"] });

    for (const [os, byArch] of Object.entries(targets)) {
      for (const [arch, byLibc] of Object.entries(byArch)) {
        for (const [libc, info] of Object.entries(byLibc)) {
          const supported = Object.prototype.hasOwnProperty.call(
            validatorTargets[os]?.[arch] ?? {},
            libc,
          );
          const installed = installedTargets[os]?.[arch]?.[libc];
          if (supported) {
            expect(installed).toEqual(info);
          } else {
            expect(installed).toBeUndefined();
          }
        }
      }
    }
  });
});
