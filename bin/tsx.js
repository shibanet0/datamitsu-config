#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { getBinaryFilepath } from "./utils.js";

const result = spawnSync(
  "node",
  [getBinaryFilepath("tsx", "../dist/cli.mjs"), ...process.argv.slice(2)],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
