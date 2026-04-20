#!/usr/bin/env node

import { spawn } from "node:child_process";
import { join } from "node:path";

import { getBinaryFilepath } from "./utils.js";

const arguments_ = process.argv.slice(2);

if (!arguments_.includes("--binary-command")) {
  arguments_.unshift("--binary-command", "pnpm datamitsu");
}

const child = spawn(
  "node",
  [
    getBinaryFilepath("@datamitsu/datamitsu/package.json", "../bin/index.js"),
    "--before-config",
    join(import.meta.dirname, "../datamitsu.config.js"),
    ...arguments_,
  ],
  {
    env: {
      ...process.env,
      DATAMITSU_PACKAGE_NAME: process.env.DATAMITSU_PACKAGE_NAME || "@shibanet0/datamitsu-config",
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else if (code !== 0) {
    process.exit(code);
  }
});
