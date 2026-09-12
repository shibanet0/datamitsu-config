import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { installedBunApp } from "../../test-support/managed-bun";

const app = installedBunApp("lefthook-sort");
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories) {
    rmSync(directory, { force: true, recursive: true });
  }
  directories.length = 0;
});

describe("managed Bun sorter", () => {
  it("sorts the default file, preserves comments and leaves canonical files untouched", () => {
    const directory = mkdtempSync(join(tmpdir(), "lefthook-sort-"));
    directories.push(directory);
    const config = join(directory, "lefthook.yaml");
    writeFileSync(
      config,
      "pre-commit:\n  commands:\n    late:\n      priority: 20\n    # first command\n    early:\n      priority: 10\n",
    );
    const execute = () =>
      spawnSync(app.command, [...app.runtimeArgs, app.artifact], {
        cwd: directory,
        encoding: "utf8",
        env: app.environment,
      });
    const first = execute();
    expect(first.status, first.stderr).toBe(0);
    expect(readFileSync(config, "utf8")).toBe(
      "pre-commit:\n  commands:\n    # first command\n    early:\n      priority: 10\n    late:\n      priority: 20\n",
    );
    utimesSync(config, 1, 1);
    const before = statSync(config).mtimeMs;
    const second = execute();
    expect(second.status, second.stderr).toBe(0);
    expect(statSync(config).mtimeMs).toBe(before);
  });
});
