import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import { alintYml } from "../../src/datamitsu-config/managed-configs/_alint_yml";
import { lsLintYml } from "../../src/datamitsu-config/managed-configs/_ls_lint_yml";

const read = (file: string) =>
  parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));

describe("repository naming-lint adoption", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("enables alint and ls-lint and preserves their operations", async () => {
    vi.stubGlobal("getConfig", undefined);
    vi.stubGlobal("getMinVersion", undefined);
    await import("../../datamitsu.config");
    const inheritedLsLint = {
      operations: { lint: { args: ["-config", "managed.yml"] } },
      skip: true,
    };
    const inheritedAlint = { operations: { lint: { args: [] } }, skip: true };
    const result = globalThis.getConfig!({
      tools: {
        alint: inheritedAlint,
        "ls-lint": inheritedLsLint,
        other: { operations: {}, skip: true },
      },
    });
    expect(result.tools!["ls-lint"]).toEqual({ ...inheritedLsLint, skip: false });
    expect(result.tools!.alint).toEqual({ ...inheritedAlint, skip: false });
    expect(result.tools!.other).toEqual({ operations: {}, skip: true });
  });

  it("leaves directory names to the managed ls-lint base", () => {
    expect(read(".ls-lint.yml")).toEqual({ ignore: ["dist-inline-eslint-config"], ls: {} });
  });

  it("narrows file names to kebab-case, exempting only generated managed-config sources", () => {
    expect(read(".alint.yml")).toEqual({
      allow_out_of_root: true,
      extends: ["alint://bundled/oss-baseline@v1", ".datamitsu/alint-managed.yml"],
      rules: [
        {
          id: "s0-js-ts-file-names",
          paths: {
            exclude: [
              "src/datamitsu-config/managed-configs/**",
              "src/datamitsu-config/inline-config/**",
            ],
            include: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
          },
          pattern: String.raw`^\.?[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9-]+)*\.(js|jsx|mjs|cjs|ts|tsx|mts|cts)$`,
        },
      ],
      version: 1,
    });
  });

  it.each([
    [".alint.yml", alintYml],
    [".ls-lint.yml", lsLintYml],
  ])(
    "%s already says what its generator produces, so reconcile changes nothing",
    (file, managed) => {
      vi.stubGlobal("YAML", { parse, stringify });
      const onDisk = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      // Text, not bytes: reconcile writes unformatted YAML and the fixers (yq, yamlfmt) sort and
      // re-indent it afterwards.
      expect(parse(managed.content!({ originalContent: onDisk } as never))).toEqual(parse(onDisk));
    },
  );
});
