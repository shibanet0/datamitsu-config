import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { schepherdApp } from "../../datamitsu-config/apps/schepherd";
import { fixtureEnvironment } from "../test-support/env";

const root = resolve(import.meta.dirname, "../../..");
const executable = (name: string) => (process.platform === "win32" ? `${name}.exe` : name);
let buildDirectory: string;
let launcher: string;
let native: string;
const directories: string[] = [];

const recorder = `package main

import (
 "encoding/json"
 "fmt"
 "os"
 "slices"
 "strconv"
)

func main() {
 file, err := os.OpenFile(os.Getenv("NATIVE_CALLS"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
 if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(125) }
 if err := json.NewEncoder(file).Encode(os.Args[1:]); err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(125) }
 if err := file.Close(); err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(125) }
 if !slices.Contains(os.Args[1:], "--compile-persistable") {
  code, err := strconv.Atoi(os.Getenv("NATIVE_FETCH_EXIT"))
  if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(125) }
  os.Exit(code)
 }
}
`;

beforeAll(() => {
  buildDirectory = mkdtempSync(join(tmpdir(), "schepherd-launcher-build-"));
  launcher = join(buildDirectory, executable("launcher"));
  native = join(buildDirectory, executable("native"));
  for (const [name, content] of Object.entries(schepherdApp.files!)) {
    writeFileSync(join(buildDirectory, name), content);
  }
  const nativeDirectory = join(buildDirectory, "native-source");
  mkdirSync(nativeDirectory);
  writeFileSync(join(nativeDirectory, "main.go"), recorder);
  const build = (directory: string, binary: string, target: string) => {
    const result = spawnSync(
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
        target,
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
    expect(result.status, result.stderr).toBe(0);
  };
  build(buildDirectory, launcher, ".");
  build(nativeDirectory, native, "main.go");
}, 180_000);

afterEach(() => {
  for (const directory of directories) rmSync(directory, { force: true, recursive: true });
  directories.length = 0;
});

afterAll(() => {
  if (buildDirectory) rmSync(buildDirectory, { force: true, recursive: true });
});

const compileArgs = [
  "--config",
  "configuration with spaces.toml",
  "--repository",
  "example.invalid/catalog",
  "--cache-dir",
  "cache with spaces",
  "materialize",
  "--concurrency",
  "2",
  "--compile-persistable",
  "--json",
];
const fetchArgs = [
  "--config",
  "configuration with spaces.toml",
  "--repository",
  "example.invalid/catalog",
  "--cache-dir",
  "cache with spaces",
  "materialize",
  "--concurrency",
  "4",
  "--json",
];

function prepare(fetchExit: number) {
  const directory = mkdtempSync(join(tmpdir(), "schepherd-launcher-run-"));
  directories.push(directory);
  const calls = join(directory, "calls.jsonl");
  const result = spawnSync(launcher, ["--prepare-catalog", ...compileArgs], {
    cwd: directory,
    encoding: "utf8",
    env: fixtureEnvironment({
      NATIVE_CALLS: calls,
      NATIVE_FETCH_EXIT: String(fetchExit),
      SCHEPHERD_BIN: native,
    }),
    timeout: 30_000,
  });
  return {
    calls: readFileSync(calls, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]),
    result,
  };
}

test("finishes fetching before compiling without forwarding the private launcher flag", () => {
  const run = prepare(0);
  expect(run.result.status, run.result.stderr).toBe(0);
  expect(run.calls).toEqual([fetchArgs, compileArgs]);
});

test("propagates a failed fetch and never starts compilation", () => {
  const run = prepare(23);
  expect(run.result.status, run.result.stderr).toBe(23);
  expect(run.calls).toEqual([fetchArgs]);
});
