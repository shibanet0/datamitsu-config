#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { getBinaryFilepath } from "./utils.js";

// TypeScript's bin/tsc is an extensionless JavaScript file: POSIX starts it through its shebang,
// Windows cannot start it at all (ENOENT), so it runs through the node executing this wrapper.
const result = spawnSync(
  process.execPath,
  [getBinaryFilepath("typescript/package.json", "bin/tsc"), ...process.argv.slice(2)],
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
