#!/usr/bin/env node

import { getExePath } from "@datamitsu/datamitsu/get-exe.js";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
if (!args.includes("--binary-command")) {
  args.unshift("--binary-command", "pnpm datamitsu");
}

const result = spawnSync(
  getExePath(),
  ["--before-config", join(import.meta.dirname, "../datamitsu.config.js"), ...args],
  {
    env: {
      ...process.env,
      DATAMITSU_PACKAGE_NAME: process.env.DATAMITSU_PACKAGE_NAME || "@shibanet0/datamitsu-config",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
