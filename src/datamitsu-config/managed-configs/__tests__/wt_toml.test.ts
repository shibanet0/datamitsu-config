import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixtureEnvironment } from "../../../apps/test-support/env";
import { HOOK_NAME, wtHookCommand, wtToml } from "../wt_toml";

const stubToml = (value: Record<string, unknown>) => {
  vi.stubGlobal("TOML", {
    parse: () => structuredClone(value),
    stringify: (written: Record<string, unknown>) => JSON.stringify(written),
  });
};

const render = () =>
  JSON.parse(wtToml.content!({ originalContent: "ignored" } as never)!) as Record<string, unknown>;

describe("wt project configuration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves unrelated project configuration", () => {
    vi.stubGlobal("facts", () => ({ binaryCommand: "pnpm exec datamitsu" }));
    stubToml({ "list.full": true });
    expect(render()["list.full"]).toBe(true);
  });

  it("keeps project commands and updates the managed hook", () => {
    vi.stubGlobal("facts", () => ({ binaryCommand: "datamitsu" }));
    stubToml({ "post-start": { [HOOK_NAME]: "tampered", server: "npm run dev" } });
    const hooks = render()["post-start"] as Record<string, string>;
    expect(hooks.server).toBe("npm run dev");
    expect(hooks[HOOK_NAME]).toBe(wtHookCommand("datamitsu"));
  });

  it("resolves the base dependency launcher without changing the destination cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "wt hook "));
    const log = join(root, "args");
    const cwdLog = join(root, "cwd");
    const basePath = join(root, "base dir's");
    const baseBin = join(basePath, "node_modules/.bin");
    mkdirSync(baseBin, { recursive: true });
    writeFileSync(
      join(baseBin, "fake-launcher"),
      '#!/bin/sh\nprintf \'%s\\0\' "$@" > "$WT_TEST_LOG"\npwd -P > "$WT_TEST_CWD"\n',
      {
        mode: 0o755,
      },
    );
    vi.stubGlobal("facts", () => ({ binaryCommand: "fake-launcher subcommand" }));
    stubToml({});
    const command = (render()["post-start"] as Record<string, string>)[HOOK_NAME]!;
    try {
      const escapedBasePath = `'${basePath.replace(/'/g, `'\\''`)}'`;
      const renderedCommand = command.replace("{{ base_worktree_path }}", escapedBasePath);
      execFileSync("sh", ["-c", renderedCommand], {
        cwd: root,
        env: fixtureEnvironment({ PATH: "/usr/bin:/bin", WT_TEST_CWD: cwdLog, WT_TEST_LOG: log }),
      });
      expect(readFileSync(log, "utf8").split("\0").filter(Boolean)).toEqual([
        "subcommand",
        "cache",
        "copy",
        "--source",
        basePath,
      ]);
      expect(readFileSync(cwdLog, "utf8").trim()).toBe(realpathSync(root));
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("retains string, table, and pipeline post-start forms", () => {
    vi.stubGlobal("facts", () => ({ binaryCommand: "pnpm dm" }));
    stubToml({ "post-start": "npm run dev" });
    const written = render();
    expect(written["post-start"]).toEqual({
      [HOOK_NAME]: wtHookCommand("pnpm dm"),
      project: "npm run dev",
    });
    stubToml(written);
    expect(render()).toEqual(written);

    stubToml({ "post-start": [{ install: "npm ci" }, { server: "npm run dev" }] });
    const pipeline = render();
    expect(pipeline["post-start"]).toEqual([
      { install: "npm ci" },
      { [HOOK_NAME]: wtHookCommand("pnpm dm"), server: "npm run dev" },
    ]);
    stubToml(pipeline);
    expect(render()).toEqual(pipeline);
  });
});
