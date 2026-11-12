import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

import { schepherdCheckJsonschemaApp } from "../schepherd-frontends";
import { fixtureEnvironment } from "../test-support/env";

const root = resolve(import.meta.dirname, "../../..");
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories) {
    rmSync(directory, { force: true, recursive: true });
  }
  directories.length = 0;
});

test("verifies the frontend launcher before requiring its managed Python binding", () => {
  const directory = mkdtempSync(join(tmpdir(), "schepherd-frontend-version-"));
  directories.push(directory);
  for (const [name, content] of Object.entries(schepherdCheckJsonschemaApp.files!)) {
    writeFileSync(join(directory, name), content);
  }
  const binary = join(directory, process.platform === "win32" ? "frontend.exe" : "frontend");
  const build = spawnSync(
    process.execPath,
    [
      join(root, "bin/datamitsu.js"),
      "runtime",
      "run",
      "go",
      "--",
      "-C",
      directory,
      "build",
      "-o",
      binary,
      ".",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnvironment({
        DATAMITSU_DEV_MODE: "true",
        DATAMITSU_PACKAGE_NAME: join(root, "dist"),
        GOWORK: "off",
      }),
      timeout: 180_000,
    },
  );
  expect(build.status, build.stderr).toBe(0);
  const environment = fixtureEnvironment({ CHECK_JSONSCHEMA_BIN: "" });
  const version = spawnSync(binary, ["--proxy-version"], {
    cwd: directory,
    encoding: "utf8",
    env: environment,
  });
  expect(version.status, version.stderr).toBe(0);
  expect(version.stdout.trim()).toBe(schepherdCheckJsonschemaApp.go!.version);
  const ordinary = spawnSync(binary, ["identity"], {
    cwd: directory,
    encoding: "utf8",
    env: environment,
  });
  expect(ordinary.status).toBe(127);
}, 180_000);
